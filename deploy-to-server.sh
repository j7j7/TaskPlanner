#!/bin/bash

# TaskPlanner Deployment Script for SSH Server
# Deploys the built application to a remote server via SSH

# Don't exit on error immediately - we want to handle errors ourselves
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}TaskPlanner SSH Deployment Script${NC}"
echo "=================================="
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: dist/ directory not found.${NC}"
    echo "Please run 'npm run build:prod' first."
    exit 1
fi

# Configuration - adjust these as needed
SERVER_INPUT="${1:-taskplanner}"
WEB_ROOT="${2:-/var/www/taskplanner}"
NGINX_CONFIG_PATH="/etc/nginx/sites-available/taskplanner"

# Check if username is included in server (user@host format)
if [[ "$SERVER_INPUT" == *"@"* ]]; then
    SERVER="$SERVER_INPUT"
else
    # No username specified - prompt for it
    echo -e "${YELLOW}No username specified in server address.${NC}"
    read -p "Enter SSH username (e.g., root, admin) [root]: " SSH_USER
    SSH_USER=${SSH_USER:-root}
    SERVER="${SSH_USER}@${SERVER_INPUT}"
fi

echo -e "${YELLOW}Deployment Configuration:${NC}"
echo "  Server: $SERVER"
echo "  Web Root: $WEB_ROOT"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}Error: sshpass is not installed.${NC}"
    echo "Install it with:"
    echo "  macOS: brew install hudochenkov/sshpass/sshpass"
    echo "  Linux: sudo apt-get install sshpass  (or sudo yum install sshpass)"
    exit 1
fi

# Prompt for SSH password
echo -e "${YELLOW}Enter SSH password for $SERVER:${NC}"
echo -e "${YELLOW}(This is the password to log into the server via SSH)${NC}"
read -s SSH_PASSWORD
echo ""

if [ -z "$SSH_PASSWORD" ]; then
    echo -e "${YELLOW}No SSH password provided. Attempting to use SSH keys...${NC}"
    SSH_CMD="ssh -o StrictHostKeyChecking=no"
    SCP_CMD="scp -o StrictHostKeyChecking=no"
    unset SSHPASS
else
    export SSHPASS="$SSH_PASSWORD"
    SSH_CMD="sshpass -e ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
    SCP_CMD="sshpass -e scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
fi

# Extract username from SERVER (user@host format)
SSH_USERNAME=$(echo "$SERVER" | cut -d@ -f1)

# Check if connecting as root
if [ "$SSH_USERNAME" = "root" ]; then
    echo -e "${GREEN}Connecting as root - sudo not needed${NC}"
    USE_SUDO=false
    SUDO_PASSWORD=""
else
    echo -e "${YELLOW}Enter sudo/root password for privileged operations:${NC}"
    read -s SUDO_PASSWORD
    USE_SUDO=true
fi
echo ""

# Test SSH connection with better error reporting
echo -e "${YELLOW}Testing SSH connection...${NC}"
CONNECTION_EXIT=1  # Initialize to failure

if [ -n "$SSH_PASSWORD" ]; then
    # Test with sshpass - simple direct test
    echo "Attempting connection..."
    CONNECTION_OUTPUT=$(sshpass -e ssh -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            -o ConnectTimeout=10 \
            -o PreferredAuthentications=password \
            -o PubkeyAuthentication=no \
            -o KbdInteractiveAuthentication=no \
            -o PasswordAuthentication=yes \
            -o BatchMode=yes \
            "$SERVER" "echo 'Connection successful'" 2>&1)
    CONNECTION_EXIT=$?
    
    if [ $CONNECTION_EXIT -eq 0 ]; then
        echo -e "${GREEN}SSH connection successful${NC}"
    else
        echo -e "${RED}Error: Cannot connect to server '$SERVER'${NC}"
        if [ -n "$CONNECTION_OUTPUT" ]; then
            echo "Error output: $CONNECTION_OUTPUT"
        fi
        echo ""
        echo "Troubleshooting:"
        echo "1. Verify the server hostname/IP is correct: $SERVER"
        echo "2. Check if SSH is running on the server (port 22)"
        echo "3. Verify the SSH password is correct for user: $(echo $SERVER | cut -d@ -f1)"
        echo "4. Try connecting manually:"
        echo "   sshpass -p 'your_password' ssh $SERVER"
        echo ""
        echo "Note: If connection hangs, it may be a Tailscale/SSH compatibility issue."
        echo "Try: sshpass -p 'password' ssh -o PreferredAuthentications=password $SERVER"
        exit 1
    fi
else
    # Test without sshpass (using keys)
    echo "Attempting connection with SSH keys..."
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER" "echo 'Connection successful'" > /dev/null 2>&1
    CONNECTION_EXIT=$?
    
    if [ $CONNECTION_EXIT -eq 0 ]; then
        echo -e "${GREEN}SSH connection successful${NC}"
    else
        echo -e "${RED}Error: Cannot connect to server '$SERVER' with SSH keys${NC}"
        echo "Connection failed with exit code: $CONNECTION_EXIT"
        echo ""
        echo "Troubleshooting:"
        echo "1. Verify SSH keys are set up correctly"
        echo "2. Check if SSH is running on the server"
        echo "3. Try connecting manually: ssh $SERVER"
        echo ""
        echo "If SSH keys are not set up, run the script again and enter the SSH password when prompted."
        exit 1
    fi
fi

# Re-enable exit on error for the rest of the script
set -e

echo ""

# Function to run commands (with or without sudo)
run_cmd() {
    if [ "$USE_SUDO" = "true" ]; then
        $SSH_CMD "$SERVER" "echo '$SUDO_PASSWORD' | sudo -S $1"
    else
        # Running as root, no sudo needed
        $SSH_CMD "$SERVER" "$1"
    fi
}

# Function to check and install packages
check_and_install_packages() {
    echo -e "${YELLOW}Checking required packages...${NC}"
    
    # Detect OS and package manager
    OS_INFO=$($SSH_CMD "$SERVER" "cat /etc/os-release 2>/dev/null | grep -E '^ID=' | cut -d= -f2 | tr -d '\"' || echo 'unknown'")
    PM=""
    
    if $SSH_CMD "$SERVER" "command -v apt-get > /dev/null 2>&1" > /dev/null 2>&1; then
        PM="apt"
        if [ "$OS_INFO" = "ubuntu" ] || [ "$OS_INFO" = "debian" ]; then
            echo "Detected: Ubuntu/Debian system"
        fi
    elif $SSH_CMD "$SERVER" "command -v yum > /dev/null 2>&1" > /dev/null 2>&1; then
        PM="yum"
        echo "Detected: RHEL/CentOS system"
    elif $SSH_CMD "$SERVER" "command -v dnf > /dev/null 2>&1" > /dev/null 2>&1; then
        PM="dnf"
        echo "Detected: Fedora/RHEL 8+ system"
    elif $SSH_CMD "$SERVER" "command -v pacman > /dev/null 2>&1" > /dev/null 2>&1; then
        PM="pacman"
        echo "Detected: Arch Linux system"
    else
        echo -e "${YELLOW}Warning: Could not detect package manager. Skipping package installation.${NC}"
        echo "Please ensure nginx is installed manually."
        return
    fi
    
    echo "Using package manager: $PM"
    
    # Check if nginx is installed
    if ! $SSH_CMD "$SERVER" "command -v nginx > /dev/null 2>&1" > /dev/null 2>&1; then
        echo -e "${YELLOW}nginx is not installed. Installing...${NC}"
        case $PM in
            apt)
                # Ubuntu/Debian - update package list and install nginx
                run_cmd "export DEBIAN_FRONTEND=noninteractive && apt-get update -qq && apt-get install -y nginx"
                ;;
            yum)
                run_cmd "yum install -y nginx"
                ;;
            dnf)
                run_cmd "dnf install -y nginx"
                ;;
            pacman)
                run_cmd "pacman -S --noconfirm nginx"
                ;;
        esac
        
        # Verify installation
        if $SSH_CMD "$SERVER" "command -v nginx > /dev/null 2>&1" > /dev/null 2>&1; then
            echo -e "${GREEN}nginx installed successfully${NC}"
        else
            echo -e "${RED}Failed to install nginx. Please install manually.${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}nginx is already installed${NC}"
        # Show nginx version
        NGINX_VERSION=$($SSH_CMD "$SERVER" "nginx -v 2>&1" | head -1)
        echo "  Version: $NGINX_VERSION"
    fi
    
    # Create nginx directories if they don't exist (Ubuntu/Debian structure)
    echo -e "${YELLOW}Ensuring nginx directories exist...${NC}"
    run_cmd "mkdir -p /etc/nginx/sites-available"
    run_cmd "mkdir -p /etc/nginx/sites-enabled"
    
    # Ensure nginx service is enabled (Ubuntu uses systemd)
    if $SSH_CMD "$SERVER" "command -v systemctl > /dev/null 2>&1" > /dev/null 2>&1; then
        echo -e "${YELLOW}Ensuring nginx service is enabled...${NC}"
        run_cmd "systemctl enable nginx 2>/dev/null || true"
    fi
    
    echo -e "${GREEN}Package check complete${NC}"
    echo ""
}

# Check and install required packages
check_and_install_packages

# Create web root directory
echo -e "${YELLOW}Creating web root directory on server...${NC}"
run_cmd "mkdir -p $WEB_ROOT && chown -R \$USER:\$USER $WEB_ROOT"

# Copy files
echo -e "${YELLOW}Copying files to server...${NC}"
if [ -n "$SSH_PASSWORD" ]; then
    sshpass -e rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" dist/ "$SERVER:$WEB_ROOT/"
else
    rsync -avz --delete dist/ "$SERVER:$WEB_ROOT/"
fi

# Set permissions
echo -e "${YELLOW}Setting file permissions...${NC}"
run_cmd "chown -R www-data:www-data $WEB_ROOT && chmod -R 755 $WEB_ROOT"

# Copy nginx config
read -p "Copy nginx configuration? (y/n) [y]: " COPY_NGINX
COPY_NGINX=${COPY_NGINX:-y}

if [ "$COPY_NGINX" = "y" ] || [ "$COPY_NGINX" = "Y" ]; then
    echo -e "${YELLOW}Copying nginx configuration...${NC}"
    
    # Ensure nginx directories exist
    run_cmd "mkdir -p /etc/nginx/sites-available"
    run_cmd "mkdir -p /etc/nginx/sites-enabled"
    
    # Create a temporary nginx config with correct web root
    sed "s|/usr/share/nginx/html|$WEB_ROOT|g" nginx.conf > /tmp/taskplanner-nginx.conf
    
    # Copy to server
    $SCP_CMD /tmp/taskplanner-nginx.conf "$SERVER:/tmp/taskplanner-nginx.conf"
    
    # Move to nginx sites-available
    run_cmd "mv /tmp/taskplanner-nginx.conf $NGINX_CONFIG_PATH"
    
    # Disable default nginx site if it exists (Ubuntu/Debian)
    echo -e "${YELLOW}Disabling default nginx site...${NC}"
    run_cmd "rm -f /etc/nginx/sites-enabled/default"
    run_cmd "rm -f /etc/nginx/sites-enabled/000-default"
    run_cmd "rm -f /etc/nginx/sites-enabled/default.conf"
    
    # List enabled sites to verify
    echo "Currently enabled nginx sites:"
    run_cmd "ls -la /etc/nginx/sites-enabled/ || echo 'No sites-enabled directory'"
    
    # Create symlink to enable our site (with a number prefix to ensure it loads first)
    echo -e "${YELLOW}Enabling taskplanner site...${NC}"
    run_cmd "ln -sf $NGINX_CONFIG_PATH /etc/nginx/sites-enabled/000-taskplanner"
    
    # Verify the symlink was created
    echo "Verifying site is enabled:"
    run_cmd "ls -la /etc/nginx/sites-enabled/ | grep taskplanner || echo 'Warning: taskplanner site not found in sites-enabled'"
    
    # Test nginx config
    echo -e "${YELLOW}Testing nginx configuration...${NC}"
    if run_cmd "nginx -t" > /dev/null 2>&1; then
        echo -e "${GREEN}Nginx configuration is valid.${NC}"
        read -p "Restart nginx? (y/n) [y]: " RESTART_NGINX
        RESTART_NGINX=${RESTART_NGINX:-y}
        
        if [ "$RESTART_NGINX" = "y" ] || [ "$RESTART_NGINX" = "Y" ]; then
            # Reload first (gentler), then restart if needed
            echo "Reloading nginx configuration..."
            run_cmd "systemctl reload nginx 2>/dev/null || systemctl restart nginx"
            echo -e "${GREEN}Nginx reloaded/restarted successfully.${NC}"
            echo ""
            
            # Verify nginx is running and which config is active
            echo "Checking nginx status:"
            run_cmd "systemctl status nginx --no-pager -l | head -10 || true"
            echo ""
            
            echo -e "${GREEN}Your application should now be accessible!${NC}"
            SERVER_HOST=$(echo $SERVER | cut -d@ -f2)
            echo "Check: http://$SERVER_HOST"
            echo ""
            echo "If you still see the default nginx page, try:"
            echo "  ssh $SERVER 'nginx -t'"
            echo "  ssh $SERVER 'ls -la /etc/nginx/sites-enabled/'"
            echo "  ssh $SERVER 'cat $NGINX_CONFIG_PATH'"
        fi
    else
        echo -e "${RED}Nginx configuration test failed. Please check manually.${NC}"
        run_cmd "nginx -t"
    fi
    
    # Cleanup temp file
    rm -f /tmp/taskplanner-nginx.conf
fi

# Clear passwords from environment
unset SSHPASS
unset SSH_PASSWORD
unset SUDO_PASSWORD

echo ""
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify the application is accessible"
echo "2. Check nginx logs if needed: ssh $SERVER 'sudo tail -f /var/log/nginx/error.log'"
echo "3. Set up SSL certificates if needed"

