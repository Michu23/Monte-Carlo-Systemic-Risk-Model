# Deployment Guide

This guide covers the deployment process for the Systemic Risk Dashboard application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Manual Deployment](#manual-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Server**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB, Recommended 50GB+
- **CPU**: Minimum 2 cores, Recommended 4+ cores

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git
- SSL certificates (for HTTPS)

### Accounts & Services

- GitHub account (for CI/CD)
- Container registry access (GitHub Container Registry)
- Domain name and DNS configuration
- SSL certificate provider (Let's Encrypt recommended)

## Environment Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/systemic-risk-dashboard
sudo chown $USER:$USER /opt/systemic-risk-dashboard
```

### 2. Clone Repository

```bash
cd /opt/systemic-risk-dashboard
git clone https://github.com/your-org/systemic-risk-dashboard.git .
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.production.template .env.production

# Edit environment variables
nano .env.production
```

Required environment variables:
- `SECRET_KEY`: Strong secret key for Flask
- `JWT_SECRET_KEY`: JWT signing key
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `CORS_ORIGINS`: Allowed frontend origins

### 4. SSL Certificate Setup

For Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/key.pem
sudo chown $USER:$USER ./nginx/ssl/*
```

## CI/CD Pipeline

### GitHub Actions Setup

1. **Repository Secrets**: Configure the following secrets in your GitHub repository:

```
# Staging Environment
STAGING_HOST=staging.yourdomain.com
STAGING_USER=deploy
STAGING_SSH_KEY=<private-key>
STAGING_SECRET_KEY=<secret>
STAGING_JWT_SECRET_KEY=<jwt-secret>
STAGING_SENTRY_DSN=<sentry-dsn>

# Production Environment
PRODUCTION_HOST=yourdomain.com
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=<private-key>
PRODUCTION_SECRET_KEY=<secret>
PRODUCTION_JWT_SECRET_KEY=<jwt-secret>
PRODUCTION_SENTRY_DSN=<sentry-dsn>

# Notifications
SLACK_WEBHOOK_URL=<slack-webhook>

# Security Scanning
SNYK_TOKEN=<snyk-token>
```

2. **SSH Key Setup**: Generate and configure SSH keys for deployment:

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "deploy@yourdomain.com" -f deploy_key

# Add public key to server
ssh-copy-id -i deploy_key.pub deploy@yourdomain.com

# Add private key to GitHub secrets as PRODUCTION_SSH_KEY
```

### Pipeline Stages

1. **Testing**: Runs unit tests, integration tests, and security scans
2. **Building**: Creates Docker images and pushes to registry
3. **Staging**: Deploys to staging environment for testing
4. **Production**: Deploys to production on release

### Triggering Deployments

- **Staging**: Push to `develop` branch
- **Production**: Create a GitHub release

## Manual Deployment

### Production Deployment

```bash
# Navigate to application directory
cd /opt/systemic-risk-dashboard

# Pull latest changes
git pull origin main

# Deploy using script
./deploy.sh deploy
```

### Deployment Script Options

```bash
# Deploy application
./deploy.sh deploy

# Create backup
./deploy.sh backup

# Check health
./deploy.sh health

# View logs
./deploy.sh logs

# Stop services
./deploy.sh stop

# Restart services
./deploy.sh restart

# Rollback deployment
./deploy.sh rollback
```

### Manual Docker Commands

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# View running services
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### Health Checks

- **Application**: `https://yourdomain.com/health`
- **API**: `https://yourdomain.com/api/health`
- **Database**: Check via application logs

### Monitoring Stack

The deployment includes:

- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Alertmanager**: Alert notifications

Access monitoring:
- Grafana: `https://yourdomain.com:3001` (admin/admin)
- Prometheus: `https://yourdomain.com:9090`

### Log Management

Logs are stored in:
- Application logs: `./logs/`
- Nginx logs: `/var/log/nginx/`
- Docker logs: `docker-compose logs`

### Backup Strategy

Automated backups include:
- Database dumps (daily)
- Application uploads
- Configuration files

Backup location: `./backup/YYYYMMDD_HHMMSS/`

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs service-name

# Restart service
docker-compose -f docker-compose.prod.yml restart service-name
```

#### 2. Database Connection Issues

```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready -U user

# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U user -d systemic_risk

# Check database logs
docker-compose -f docker-compose.prod.yml logs db
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in ./nginx/ssl/cert.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew

# Update certificate in deployment
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/key.pem
docker-compose -f docker-compose.prod.yml restart nginx
```

#### 4. Performance Issues

```bash
# Check resource usage
docker stats

# Check system resources
htop
df -h

# Optimize database
docker-compose -f docker-compose.prod.yml exec db psql -U user -d systemic_risk -c "VACUUM ANALYZE;"
```

### Emergency Procedures

#### Rollback Deployment

```bash
# Automatic rollback
./deploy.sh rollback

# Manual rollback
docker-compose -f docker-compose.prod.yml down
# Restore from backup
# Restart services
```

#### Database Recovery

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
docker-compose -f docker-compose.prod.yml exec -T db psql -U user -d systemic_risk < backup/latest/database.sql

# Restart application
docker-compose -f docker-compose.prod.yml start backend
```

### Support Contacts

- **Technical Issues**: tech-support@yourdomain.com
- **Emergency**: emergency@yourdomain.com
- **Documentation**: docs@yourdomain.com

### Useful Commands

```bash
# Check disk usage
du -sh /opt/systemic-risk-dashboard/*

# Monitor real-time logs
tail -f logs/app.log

# Check network connectivity
curl -I https://yourdomain.com/health

# Database backup
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U user systemic_risk > backup/manual_backup_$(date +%Y%m%d_%H%M%S).sql

# Clean up old Docker images
docker system prune -a
```