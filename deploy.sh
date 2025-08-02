#!/bin/bash

# Production deployment script for Systemic Risk Dashboard
set -e

echo "🚀 Starting production deployment..."

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backup/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="./logs/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f ".env.production" ]; then
        error "Production environment file (.env.production) not found"
        exit 1
    fi
    
    log "Prerequisites check passed ✅"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps db | grep -q "Up"; then
        log "Backing up database..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T db pg_dump -U user systemic_risk > "$BACKUP_DIR/database.sql"
    fi
    
    # Backup uploads
    if [ -d "./uploads" ]; then
        log "Backing up uploads..."
        cp -r ./uploads "$BACKUP_DIR/"
    fi
    
    # Backup logs
    if [ -d "./logs" ]; then
        log "Backing up logs..."
        cp -r ./logs "$BACKUP_DIR/"
    fi
    
    log "Backup created at $BACKUP_DIR ✅"
}

# Build and deploy
deploy() {
    log "Starting deployment..."
    
    # Load environment variables
    export $(cat .env.production | xargs)
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build custom images
    log "Building application images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Start services
    log "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database migrations completed')
"
    
    log "Deployment completed ✅"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check backend health
    if curl -f http://localhost:5001/health > /dev/null 2>&1; then
        log "Backend health check passed ✅"
    else
        error "Backend health check failed ❌"
        return 1
    fi
    
    # Check frontend
    if curl -f http://localhost/ > /dev/null 2>&1; then
        log "Frontend health check passed ✅"
    else
        error "Frontend health check failed ❌"
        return 1
    fi
    
    # Check database
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T db pg_isready -U user > /dev/null 2>&1; then
        log "Database health check passed ✅"
    else
        error "Database health check failed ❌"
        return 1
    fi
    
    log "All health checks passed ✅"
}

# Rollback function
rollback() {
    error "Deployment failed. Rolling back..."
    
    # Stop current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restore from backup if available
    if [ -d "$BACKUP_DIR" ]; then
        log "Restoring from backup..."
        
        # Restore database
        if [ -f "$BACKUP_DIR/database.sql" ]; then
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d db
            sleep 10
            docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T db psql -U user -d systemic_risk < "$BACKUP_DIR/database.sql"
        fi
        
        # Restore uploads
        if [ -d "$BACKUP_DIR/uploads" ]; then
            rm -rf ./uploads
            cp -r "$BACKUP_DIR/uploads" ./
        fi
    fi
    
    error "Rollback completed"
    exit 1
}

# Cleanup old backups (keep last 5)
cleanup_backups() {
    log "Cleaning up old backups..."
    
    if [ -d "./backup" ]; then
        cd ./backup
        ls -t | tail -n +6 | xargs -r rm -rf
        cd ..
    fi
    
    log "Backup cleanup completed ✅"
}

# Main deployment process
main() {
    # Create logs directory
    mkdir -p logs
    
    log "=== Production Deployment Started ==="
    
    # Trap errors and rollback
    trap rollback ERR
    
    check_prerequisites
    create_backup
    deploy
    
    # Health check with retries
    for i in {1..5}; do
        if health_check; then
            break
        elif [ $i -eq 5 ]; then
            error "Health check failed after 5 attempts"
            rollback
        else
            warning "Health check failed, retrying in 30 seconds... (attempt $i/5)"
            sleep 30
        fi
    done
    
    cleanup_backups
    
    log "=== Production Deployment Completed Successfully ==="
    log "Application is now running at:"
    log "  Frontend: http://localhost/"
    log "  Backend API: http://localhost:5001/api"
    log "  Health Check: http://localhost/health"
    
    # Display running services
    log "Running services:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "backup")
        create_backup
        ;;
    "logs")
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
        ;;
    "stop")
        log "Stopping services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        ;;
    "restart")
        log "Restarting services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" restart
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|backup|logs|stop|restart}"
        exit 1
        ;;
esac