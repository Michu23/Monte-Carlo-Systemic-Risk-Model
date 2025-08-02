# User Guide

Welcome to the Systemic Risk Dashboard! This guide will help you understand how to use the application to analyze systemic risk in banking systems.

## Table of Contents

- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
- [Managing Simulations](#managing-simulations)
- [Bank Data Management](#bank-data-management)
- [Analyzing Results](#analyzing-results)
- [Sharing and Exporting](#sharing-and-exporting)
- [Account Settings](#account-settings)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Creating an Account

1. Navigate to the application URL
2. Click "Sign Up" on the login page
3. Fill in your details:
   - Username
   - Email address
   - Password
   - First and Last name
4. Click "Create Account"
5. You'll be automatically logged in

### Logging In

1. Enter your username and password
2. Click "Sign In"
3. You'll be redirected to the dashboard

### First Time Setup

After logging in for the first time:

1. **Review Bank Data**: Check the default bank data or import your own
2. **Explore Dashboard**: Familiarize yourself with the interface
3. **Run Sample Simulation**: Try creating a simple simulation to understand the workflow

## Dashboard Overview

The dashboard provides an overview of your simulations and key metrics.

### Main Sections

1. **Summary Cards**: Quick overview of recent activity
2. **Recent Simulations**: List of your latest simulations
3. **Quick Actions**: Buttons to create new simulations or manage banks
4. **System Status**: Current system health and performance

### Navigation

- **Dashboard**: Main overview page
- **Simulations**: Manage all your simulations
- **Banks**: Manage bank data
- **History**: View simulation history and comparisons
- **Settings**: Account and application settings

## Managing Simulations

### Creating a New Simulation

1. Click "New Simulation" from the dashboard or simulations page
2. Fill in simulation details:
   - **Name**: Descriptive name for your simulation
   - **Description**: Optional detailed description
3. Configure parameters:
   - **Shock Probability**: Probability of external shock (0-1)
   - **Number of Simulations**: How many iterations to run (100-10000)
   - **Systemic Threshold**: Number of failures considered systemic
   - **Traditional LGD**: Loss Given Default for traditional banking
   - **Blockchain LGD**: Loss Given Default for blockchain banking
   - **Liability Reduction**: Reduction in liabilities with blockchain
4. Click "Create Simulation"

### Parameter Guidelines

- **Shock Probability**: Start with 0.1 (10%) for typical scenarios
- **Number of Simulations**: Use 1000+ for reliable results
- **Systemic Threshold**: Usually 3-5 banks for systemic risk
- **LGD Values**: Traditional typically 0.4-0.5, Blockchain 0.3-0.4
- **Liability Reduction**: Blockchain efficiency gains, typically 0.1-0.3

### Monitoring Simulation Progress

1. Navigate to the simulation detail page
2. View real-time progress bar and status updates
3. Monitor current step and estimated completion time
4. Receive notifications when simulation completes

### Simulation States

- **Pending**: Queued for execution
- **Running**: Currently executing
- **Completed**: Finished successfully
- **Failed**: Encountered an error
- **Cancelled**: Manually stopped

## Bank Data Management

### Viewing Bank Data

1. Navigate to "Banks" section
2. View list of all banks with key metrics:
   - Assets and Liabilities
   - Capital Ratio
   - Liquidity Ratio
   - Country and Type

### Adding New Banks

1. Click "Add Bank" button
2. Fill in bank information:
   - Name
   - Assets (in currency units)
   - Liabilities (in currency units)
   - Capital Ratio (decimal, e.g., 0.12 for 12%)
   - Liquidity Ratio (decimal)
   - Country (ISO code)
   - Bank Type (commercial, investment, central)
3. Click "Save"

### Editing Bank Data

1. Click the edit icon next to a bank
2. Modify the desired fields
3. Click "Save Changes"

### Importing Bank Data

1. Click "Import" button
2. Select CSV file with bank data
3. Map columns to required fields
4. Review and confirm import
5. Click "Import Banks"

**CSV Format Example:**
```csv
name,assets,liabilities,capital_ratio,liquidity_ratio,country,bank_type
"Bank of America",2500000000000,2200000000000,0.12,0.15,US,commercial
"JPMorgan Chase",3200000000000,2800000000000,0.14,0.18,US,commercial
```

### Exporting Bank Data

1. Click "Export" button
2. Choose format (CSV, JSON, Excel)
3. Select fields to include
4. Click "Download"

## Analyzing Results

### Results Overview

After a simulation completes, you can view:

1. **Summary Statistics**: Key metrics comparison
2. **Visualizations**: Charts and graphs
3. **Statistical Analysis**: Significance tests
4. **Raw Data**: Individual simulation results

### Key Metrics

- **Average Failures**: Mean number of bank failures
- **Maximum Failures**: Worst-case scenario
- **Systemic Risk Probability**: Chance of systemic event
- **Standard Deviation**: Variability in outcomes
- **Improvement Percentage**: Blockchain vs Traditional benefit

### Chart Types

1. **Failure Distribution**: Histogram of failure counts
2. **Cumulative Probability**: ECDF plots
3. **Box Plot Comparison**: Statistical comparison
4. **Correlation Heatmap**: Bank interconnectedness

### Statistical Analysis

The system provides:
- **T-test Results**: Statistical significance
- **P-values**: Probability of observed difference
- **Cohen's D**: Effect size measurement
- **Confidence Intervals**: Range of likely values

### Interpreting Results

**Good Results Indicators:**
- Lower average failures with blockchain
- Reduced systemic risk probability
- Statistically significant improvements (p < 0.05)
- Medium to large effect sizes

**Warning Signs:**
- High variability in results
- Non-significant differences
- Unexpected increases in risk

## Sharing and Exporting

### Exporting Results

1. Open simulation results
2. Click "Export" button
3. Choose format:
   - **JSON**: Structured data for analysis
   - **CSV**: Spreadsheet-compatible data
   - **PDF**: Complete report with charts
   - **Images**: High-resolution chart images
4. Select what to include:
   - Parameters
   - Statistical analysis
   - Charts and visualizations
   - Raw simulation data
5. Click "Export"

### Sharing Simulations

1. Open simulation results
2. Click "Share" button
3. Configure sharing options:
   - **Expiration**: How long link remains valid
   - **Password Protection**: Optional password requirement
   - **Include Raw Data**: Whether to include detailed data
4. Click "Create Share Link"
5. Copy the generated link to share

### Managing Shared Links

1. View active share links in the sharing dialog
2. Copy links to clipboard
3. Revoke links when no longer needed
4. Monitor link usage and expiration

## Account Settings

### Profile Settings

1. Navigate to Settings → Profile
2. Update personal information:
   - First and Last name
   - Organization
   - Job title
3. Click "Save Changes"

### Security Settings

1. Navigate to Settings → Security
2. Change password:
   - Enter current password
   - Enter new password
   - Confirm new password
3. Manage API keys for programmatic access
4. View account activity log

### Notification Preferences

1. Navigate to Settings → Notifications
2. Configure email notifications:
   - Simulation completion
   - System updates
   - Weekly digest
3. Save preferences

### Appearance Settings

1. Navigate to Settings → Appearance
2. Choose theme (Light/Dark/System)
3. Select interface density
4. Choose chart color scheme
5. Save preferences

## Troubleshooting

### Common Issues

#### Simulation Fails to Start

**Possible Causes:**
- Invalid parameters
- Insufficient bank data
- System overload

**Solutions:**
1. Check parameter values are within valid ranges
2. Ensure at least 10 banks are available
3. Try again during off-peak hours
4. Contact support if issue persists

#### Slow Performance

**Possible Causes:**
- Large number of simulations
- Complex bank network
- Browser limitations

**Solutions:**
1. Reduce number of simulations for testing
2. Use modern browser (Chrome, Firefox, Safari)
3. Close other browser tabs
4. Clear browser cache

#### Charts Not Loading

**Possible Causes:**
- Browser compatibility
- JavaScript disabled
- Network issues

**Solutions:**
1. Enable JavaScript in browser
2. Try different browser
3. Check internet connection
4. Refresh the page

#### Export/Share Not Working

**Possible Causes:**
- Browser popup blocker
- File size limitations
- Network timeout

**Solutions:**
1. Allow popups for the site
2. Try smaller export (exclude raw data)
3. Check network connection
4. Try again later

### Getting Help

#### In-App Help

- Hover over (?) icons for tooltips
- Check status messages and notifications
- Review parameter guidelines

#### Documentation

- User Guide (this document)
- API Documentation
- FAQ section

#### Support Channels

- **Email**: support@yourdomain.com
- **Help Desk**: Available during business hours
- **Community Forum**: User discussions and tips

### Best Practices

#### Simulation Design

1. **Start Small**: Begin with fewer simulations for testing
2. **Validate Parameters**: Ensure realistic parameter values
3. **Document Purpose**: Use descriptive names and descriptions
4. **Regular Backups**: Export important results

#### Data Management

1. **Clean Data**: Ensure bank data is accurate and complete
2. **Regular Updates**: Keep bank information current
3. **Backup Data**: Export bank data regularly
4. **Version Control**: Track changes to bank datasets

#### Performance Optimization

1. **Batch Operations**: Group similar simulations
2. **Off-Peak Usage**: Run large simulations during low-traffic times
3. **Cache Results**: Save frequently accessed results
4. **Monitor Resources**: Check system status before large operations

#### Security

1. **Strong Passwords**: Use complex, unique passwords
2. **Regular Updates**: Change passwords periodically
3. **Secure Sharing**: Use password protection for sensitive shares
4. **Monitor Activity**: Review account activity regularly

### Keyboard Shortcuts

- **Ctrl/Cmd + N**: New simulation
- **Ctrl/Cmd + S**: Save current work
- **Ctrl/Cmd + E**: Export current view
- **Ctrl/Cmd + /**: Open help
- **Esc**: Close dialogs/modals
- **Tab**: Navigate between form fields
- **Enter**: Submit forms/confirm actions

### Browser Requirements

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- JavaScript enabled
- Cookies enabled
- WebSocket support
- Local storage access

**Recommended Settings:**
- Allow popups for export/download
- Enable notifications for updates
- Allow clipboard access for sharing