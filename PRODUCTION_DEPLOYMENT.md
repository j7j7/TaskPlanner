# Production Deployment Guide for LXC

This guide explains how to build and deploy the TaskPlanner frontend application to a Linux LXC container.

## Prerequisites

- Node.js 20+ installed on your build machine
- Access to your LXC container (via SSH or direct access)
- nginx installed on the LXC container
- Your InstantDB App ID

## Environment Variables

The application requires the following environment variable:

- `VITE_INSTANT_APP_ID`: Your InstantDB application ID

## Building the Production Bundle

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Environment Variable and Build

```bash
# Set your InstantDB App ID
export VITE_INSTANT_APP_ID=your_actual_app_id

# Build for production
npm run build:prod
```

The built files will be in the `dist/` directory, ready to be deployed.

### Step 3: Test Locally (Optional)

```bash
# Preview the production build locally
npm run preview:prod
```

Visit `http://localhost:4173` to verify everything works.

## Deployment to LXC Container

### Option 1: Manual Deployment

1. **Copy files to LXC container:**

```bash
# Replace 'container-name' with your LXC container name
# Replace '/var/www/taskplanner' with your desired web root directory
lxc file push -r dist/* container-name/var/www/taskplanner/

# Or if using SSH access:
scp -r dist/* user@container-ip:/var/www/taskplanner/
```

2. **Set proper permissions:**

```bash
lxc exec container-name -- chown -R www-data:www-data /var/www/taskplanner
lxc exec container-name -- chmod -R 755 /var/www/taskplanner
```

3. **Configure nginx** (see nginx.conf section below)

4. **Restart nginx:**

```bash
lxc exec container-name -- systemctl restart nginx
```

### Option 2: Using Deployment Script

Use the provided `deploy.sh` script:

```bash
# Make it executable
chmod +x deploy.sh

# Deploy (you'll be prompted for details)
./deploy.sh
```

## nginx Configuration

Copy the `nginx.conf` file to your LXC container and configure it:

1. **Copy nginx config:**

```bash
lxc file push nginx.conf container-name/etc/nginx/sites-available/taskplanner
```

2. **Create symlink:**

```bash
lxc exec container-name -- ln -s /etc/nginx/sites-available/taskplanner /etc/nginx/sites-enabled/taskplanner
```

3. **Update the web root path** in `nginx.conf` if different from `/var/www/taskplanner`

4. **Test nginx configuration:**

```bash
lxc exec container-name -- nginx -t
```

5. **Restart nginx:**

```bash
lxc exec container-name -- systemctl restart nginx
```

## Quick Deployment Commands

```bash
# Build
export VITE_INSTANT_APP_ID=your_app_id && npm run build:prod

# Deploy to LXC (adjust paths as needed)
lxc file push -r dist/* container-name/var/www/taskplanner/
lxc exec container-name -- chown -R www-data:www-data /var/www/taskplanner
lxc exec container-name -- systemctl reload nginx
```

## Directory Structure on LXC Container

```
/var/www/taskplanner/
├── index.html
├── assets/
│   ├── index-*.js
│   └── index-*.css
└── vite.svg (if present)
```

## nginx Configuration Details

The provided `nginx.conf` includes:

- **SPA Routing**: All routes serve `index.html` for React Router
- **Gzip Compression**: Enabled for better performance
- **Static Asset Caching**: 1 year cache for JS/CSS/images
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **Health Check**: `/health` endpoint for monitoring

## SSL/HTTPS Setup (Recommended)

For production, set up SSL certificates:

```bash
# Install certbot on LXC container
lxc exec container-name -- apt-get update
lxc exec container-name -- apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
lxc exec container-name -- certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

Update `nginx.conf` to redirect HTTP to HTTPS:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    # ... rest of config with SSL settings
}
```

## Troubleshooting

### Build fails with "VITE_INSTANT_APP_ID must be set"

Make sure you export the environment variable before building:
```bash
export VITE_INSTANT_APP_ID=your_app_id
npm run build:prod
```

### 404 errors on routes

Ensure nginx is configured to serve `index.html` for all routes. Check that the `try_files` directive in `nginx.conf` includes `/index.html`.

### Permission denied errors

Make sure the web server user (usually `www-data`) has read access:
```bash
lxc exec container-name -- chown -R www-data:www-data /var/www/taskplanner
lxc exec container-name -- chmod -R 755 /var/www/taskplanner
```

### nginx won't start

Check nginx configuration:
```bash
lxc exec container-name -- nginx -t
```

Check nginx error logs:
```bash
lxc exec container-name -- tail -f /var/log/nginx/error.log
```

## Production Checklist

- [ ] Set `VITE_INSTANT_APP_ID` environment variable
- [ ] Build production bundle with `npm run build:prod`
- [ ] Test build locally with `npm run preview:prod`
- [ ] Copy `dist/` contents to LXC container
- [ ] Set proper file permissions on LXC container
- [ ] Configure nginx with provided `nginx.conf`
- [ ] Test nginx configuration
- [ ] Restart nginx service
- [ ] Verify application loads correctly
- [ ] Set up SSL certificates (recommended)
- [ ] Configure firewall rules if needed
- [ ] Set up monitoring/logging
- [ ] Test all application functionality

## Notes

- The production build creates static files in the `dist/` directory
- All React Router routes are handled client-side via nginx configuration
- Static assets are optimized and cached for performance
- Environment variables are baked into the build at build time
- To update, rebuild and redeploy the `dist/` folder
