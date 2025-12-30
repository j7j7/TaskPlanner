#!/bin/bash

# TaskPlanner Deployment Script for LXC
# This script helps deploy the built application to an LXC container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}TaskPlanner LXC Deployment Script${NC}"
echo "=================================="
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: dist/ directory not found.${NC}"
    echo "Please run 'npm run build:prod' first."
    exit 1
fi

# Get deployment details
read -p "Enter LXC container name: " CONTAINER_NAME
read -p "Enter web root path [/var/www/taskplanner]: " WEB_ROOT
WEB_ROOT=${WEB_ROOT:-/var/www/taskplanner}

read -p "Do you want to copy nginx config? (y/n) [y]: " COPY_NGINX
COPY_NGINX=${COPY_NGINX:-y}

# Create web root directory if it doesn't exist
echo -e "${YELLOW}Creating web root directory...${NC}"
lxc exec "$CONTAINER_NAME" -- mkdir -p "$WEB_ROOT"

# Copy files
echo -e "${YELLOW}Copying files to LXC container...${NC}"
lxc file push -r dist/* "$CONTAINER_NAME$WEB_ROOT/"

# Set permissions
echo -e "${YELLOW}Setting file permissions...${NC}"
lxc exec "$CONTAINER_NAME" -- chown -R www-data:www-data "$WEB_ROOT"
lxc exec "$CONTAINER_NAME" -- chmod -R 755 "$WEB_ROOT"

# Copy nginx config if requested
if [ "$COPY_NGINX" = "y" ] || [ "$COPY_NGINX" = "Y" ]; then
    echo -e "${YELLOW}Copying nginx configuration...${NC}"
    
    # Update nginx.conf with correct web root
    sed "s|/usr/share/nginx/html|$WEB_ROOT|g" nginx.conf > /tmp/taskplanner-nginx.conf
    
    lxc file push /tmp/taskplanner-nginx.conf "$CONTAINER_NAME/etc/nginx/sites-available/taskplanner"
    
    # Create symlink if it doesn't exist
    lxc exec "$CONTAINER_NAME" -- bash -c "ln -sf /etc/nginx/sites-available/taskplanner /etc/nginx/sites-enabled/taskplanner || true"
    
    # Test nginx config
    echo -e "${YELLOW}Testing nginx configuration...${NC}"
    if lxc exec "$CONTAINER_NAME" -- nginx -t; then
        echo -e "${GREEN}Nginx configuration is valid.${NC}"
        read -p "Restart nginx? (y/n) [y]: " RESTART_NGINX
        RESTART_NGINX=${RESTART_NGINX:-y}
        
        if [ "$RESTART_NGINX" = "y" ] || [ "$RESTART_NGINX" = "Y" ]; then
            lxc exec "$CONTAINER_NAME" -- systemctl restart nginx
            echo -e "${GREEN}Nginx restarted successfully.${NC}"
        fi
    else
        echo -e "${RED}Nginx configuration test failed. Please check manually.${NC}"
    fi
    
    # Cleanup temp file
    rm -f /tmp/taskplanner-nginx.conf
fi

echo ""
echo -e "${GREEN}Deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify the application is accessible"
echo "2. Check nginx logs if needed: lxc exec $CONTAINER_NAME -- tail -f /var/log/nginx/error.log"
echo "3. Set up SSL certificates if needed"

