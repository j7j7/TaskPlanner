# Quick Deploy Commands

The production build is ready in the `dist/` directory. Use these commands to deploy to your taskplanner server:

## Option 1: Using the Deployment Script

```bash
# Basic usage (assumes 'taskplanner' is configured in SSH config)
./deploy-to-server.sh

# With custom server and path
./deploy-to-server.sh user@taskplanner.example.com /var/www/taskplanner

# With IP address
./deploy-to-server.sh user@192.168.1.100 /var/www/taskplanner
```

## Option 2: Manual Deployment Commands

Replace `taskplanner` with your actual server hostname or `user@hostname`:

```bash
# 1. Create directory on server
ssh taskplanner "sudo mkdir -p /var/www/taskplanner && sudo chown -R \$USER:\$USER /var/www/taskplanner"

# 2. Copy files (using rsync - recommended)
rsync -avz --delete dist/ taskplanner:/var/www/taskplanner/

# Or using scp
scp -r dist/* taskplanner:/var/www/taskplanner/

# 3. Set permissions
ssh taskplanner "sudo chown -R www-data:www-data /var/www/taskplanner && sudo chmod -R 755 /var/www/taskplanner"

# 4. Copy nginx config
scp nginx.conf taskplanner:/tmp/taskplanner-nginx.conf
ssh taskplanner "sudo mv /tmp/taskplanner-nginx.conf /etc/nginx/sites-available/taskplanner"

# 5. Enable site
ssh taskplanner "sudo ln -sf /etc/nginx/sites-available/taskplanner /etc/nginx/sites-enabled/taskplanner"

# 6. Test and restart nginx
ssh taskplanner "sudo nginx -t && sudo systemctl restart nginx"
```

## If SSH Connection Fails

If you get connection errors, try:

1. **Specify user explicitly:**
   ```bash
   ssh user@taskplanner
   ```

2. **Use IP address:**
   ```bash
   ssh user@192.168.x.x
   ```

3. **Check SSH config:**
   ```bash
   cat ~/.ssh/config
   ```

4. **Test connection first:**
   ```bash
   ssh -v taskplanner
   ```

## Build Status

✅ Production build completed successfully!
- Files are in: `dist/`
- Build output:
  - index.html (1.03 kB)
  - CSS bundle (38.56 kB)
  - JS bundles (vendor, dnd, instantdb, index)

## Important Notes

- Make sure `VITE_INSTANT_APP_ID` is set when building (if not already set, rebuild with: `export VITE_INSTANT_APP_ID=your_app_id && npm run build:prod`)
- The nginx config assumes web root at `/var/www/taskplanner` - adjust if different
- Ensure nginx is installed on the target server
- The deployment script will prompt you for nginx configuration

