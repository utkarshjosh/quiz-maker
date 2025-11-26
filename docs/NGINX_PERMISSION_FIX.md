# Nginx Permission Denied Fix

## Problem

Nginx error logs show:

```
stat() "/home/ubuntu/quiz-maker/apps/web/dist/index.html" failed (13: Permission denied)
```

This means the Nginx worker process cannot read the static files.

## Root Cause

- Nginx runs as user `www-data` (or `nginx`)
- Your files are in `/home/ubuntu/quiz-maker/` owned by user `ubuntu`
- Home directories typically have restrictive permissions (700 or 750)
- The `www-data` user cannot traverse into `/home/ubuntu/`

## Solutions (Choose One)

### Solution 1: Fix Permissions (Recommended)

Give Nginx permission to read the files:

```bash
# 1. Give execute permission on parent directories (required for traversal)
sudo chmod o+x /home/ubuntu
sudo chmod o+x /home/ubuntu/quiz-maker
sudo chmod o+x /home/ubuntu/quiz-maker/apps
sudo chmod o+x /home/ubuntu/quiz-maker/apps/web

# 2. Give read permission to the dist directory and its contents
sudo chmod -R o+r /home/ubuntu/quiz-maker/apps/web/dist

# 3. Ensure directories are executable (needed to list contents)
sudo find /home/ubuntu/quiz-maker/apps/web/dist -type d -exec chmod o+x {} \;

# 4. Test Nginx can now read the file
sudo -u www-data cat /home/ubuntu/quiz-maker/apps/web/dist/index.html
# Should display the HTML content without errors

# 5. Restart Nginx
sudo systemctl restart nginx
```

### Solution 2: Move Files to Standard Location (Alternative)

Move the static files to a location Nginx can access:

```bash
# 1. Create directory in standard location
sudo mkdir -p /var/www/quiz-maker

# 2. Copy files
sudo cp -r /home/ubuntu/quiz-maker/apps/web/dist/* /var/www/quiz-maker/

# 3. Set proper ownership
sudo chown -R www-data:www-data /var/www/quiz-maker

# 4. Update Nginx config to point to new location
# In your Nginx config, change:
#   root /home/ubuntu/quiz-maker/apps/web/dist;
# To:
#   root /var/www/quiz-maker;

# 5. Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### Solution 3: Add Nginx User to Ubuntu Group (Less Secure)

```bash
# Add www-data to ubuntu group
sudo usermod -a -G ubuntu www-data

# Give group read access
sudo chmod -R g+rx /home/ubuntu/quiz-maker/apps/web/dist

# Restart Nginx (required after usermod)
sudo systemctl restart nginx
```

## Verification

### Check Permissions

```bash
# Check directory permissions
ls -la /home/ubuntu/
ls -la /home/ubuntu/quiz-maker/
ls -la /home/ubuntu/quiz-maker/apps/web/
ls -la /home/ubuntu/quiz-maker/apps/web/dist/

# Should show:
# drwxr-xr-x for directories (755)
# -rw-r--r-- for files (644)
```

### Test Nginx User Access

```bash
# Try to read as www-data user
sudo -u www-data cat /home/ubuntu/quiz-maker/apps/web/dist/index.html

# If this works, Nginx should work too
```

### Check Nginx Config

Look for the correct root path in your Nginx config:

```bash
# Check current config
sudo nginx -T | grep -A 20 "quiz.utkarshjoshi.com"

# Should see something like:
# server {
#     server_name quiz.utkarshjoshi.com;
#     root /home/ubuntu/quiz-maker/apps/web/dist;
#     ...
# }
```

### Monitor Nginx Logs

```bash
# Clear error log
sudo truncate -s 0 /var/log/nginx/error.log

# Try to access your site
# Then check for new errors:
sudo tail -f /var/log/nginx/error.log
```

## Current Nginx Config Issue

Your current `infra/nginx.conf` file has:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;  # This is wrong!
    index index.html;
```

This should be:

```nginx
server {
    listen 80;
    server_name quiz.utkarshjoshi.com;
    root /home/ubuntu/quiz-maker/apps/web/dist;  # Correct path
    index index.html;
```

## Quick Fix Script

Create and run this script:

```bash
#!/bin/bash
# fix-nginx-permissions.sh

echo "🔧 Fixing Nginx permissions for frontend files..."

# Set execute permissions on parent directories
echo "📁 Setting directory permissions..."
sudo chmod o+x /home/ubuntu
sudo chmod o+x /home/ubuntu/quiz-maker
sudo chmod o+x /home/ubuntu/quiz-maker/apps
sudo chmod o+x /home/ubuntu/quiz-maker/apps/web

# Set read permissions on dist directory
echo "📖 Setting read permissions on dist files..."
sudo chmod -R o+r /home/ubuntu/quiz-maker/apps/web/dist

# Set execute permissions on subdirectories
echo "🗂️  Setting execute permissions on subdirectories..."
sudo find /home/ubuntu/quiz-maker/apps/web/dist -type d -exec chmod o+x {} \;

# Test if Nginx user can read the file
echo "🧪 Testing Nginx user access..."
if sudo -u www-data cat /home/ubuntu/quiz-maker/apps/web/dist/index.html > /dev/null 2>&1; then
    echo "✅ Success! Nginx user can read the files"
else
    echo "❌ Failed! Nginx user still cannot read the files"
    echo "Try Solution 2 (move files) or Solution 3 (add to group)"
    exit 1
fi

# Restart Nginx
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo "✨ Done! Check your site now."
```

## Security Note

**Solution 1 (Fix Permissions)** is recommended because:

- ✅ Files stay in your project directory
- ✅ Easy to rebuild and deploy
- ✅ Only gives read access, not write

Avoid giving write permissions (`w`) to Nginx user!

## Production Nginx Config

Here's what your production Nginx config should look like:

```nginx
# Frontend
server {
    server_name quiz.utkarshjoshi.com;
    root /home/ubuntu/quiz-maker/apps/web/dist;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SSL managed by Certbot
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/quiz.utkarshjoshi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quiz.utkarshjoshi.com/privkey.pem;
}

# API Backend
server {
    server_name quiz-api.utkarshjoshi.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # OAuth settings
        proxy_redirect off;
        proxy_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffers
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;
    }

    # SSL managed by Certbot
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/quiz-api.utkarshjoshi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quiz-api.utkarshjoshi.com/privkey.pem;
}

# WebSocket
server {
    server_name quiz-ws.utkarshjoshi.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # SSL managed by Certbot
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/quiz-ws.utkarshjoshi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quiz-ws.utkarshjoshi.com/privkey.pem;
}
```

## Troubleshooting

### Still Getting Permission Denied?

1. **Check SELinux (if enabled):**

   ```bash
   # Check if SELinux is enabled
   sestatus

   # If enabled, you may need to set context
   sudo semanage fcontext -a -t httpd_sys_content_t "/home/ubuntu/quiz-maker/apps/web/dist(/.*)?"
   sudo restorecon -R /home/ubuntu/quiz-maker/apps/web/dist
   ```

2. **Check AppArmor (Ubuntu):**

   ```bash
   # Check AppArmor status
   sudo aa-status

   # If blocking Nginx, you may need to adjust profile
   ```

3. **Verify Nginx User:**

   ```bash
   # Check which user Nginx runs as
   ps aux | grep nginx

   # Usually www-data on Ubuntu, nginx on CentOS
   ```

### Files Keep Getting Wrong Permissions After Build?

Add to your build script:

```bash
# In your deployment script
npm run build
chmod -R o+r dist/
find dist/ -type d -exec chmod o+x {} \;
```

Or set umask before building:

```bash
umask 022  # Files will be 644, directories 755
npm run build
```

## Summary

**Quick Fix (Run These Commands):**

```bash
# 1. Fix permissions
sudo chmod o+x /home/ubuntu /home/ubuntu/quiz-maker /home/ubuntu/quiz-maker/apps /home/ubuntu/quiz-maker/apps/web
sudo chmod -R o+r /home/ubuntu/quiz-maker/apps/web/dist
sudo find /home/ubuntu/quiz-maker/apps/web/dist -type d -exec chmod o+x {} \;

# 2. Test
sudo -u www-data cat /home/ubuntu/quiz-maker/apps/web/dist/index.html

# 3. Restart
sudo systemctl restart nginx

# 4. Check logs
sudo tail -f /var/log/nginx/error.log
```

**If Still Not Working:**

- Use Solution 2 (move to `/var/www/`)
- Check SELinux/AppArmor
- Verify Nginx config has correct `root` path
