#!/bin/bash
# fix-nginx-permissions.sh
# Fixes Nginx permission denied errors for static files

set -e

echo "🔧 Fixing Nginx permissions for frontend files..."
echo ""

# Check if running on the server (has ubuntu user)
if ! id -u ubuntu > /dev/null 2>&1; then
    echo "⚠️  Warning: 'ubuntu' user not found."
    echo "This script is designed for servers with /home/ubuntu/ directory."
    echo "Please adjust paths if your setup is different."
    exit 1
fi

# Define paths
PROJECT_ROOT="/home/ubuntu/quiz-maker"
DIST_PATH="$PROJECT_ROOT/apps/web/dist"

# Check if dist directory exists
if [ ! -d "$DIST_PATH" ]; then
    echo "❌ Error: Directory not found: $DIST_PATH"
    echo "Please build the frontend first: npm run build"
    exit 1
fi

echo "📁 Setting directory permissions for Nginx traversal..."
# Nginx needs execute (x) permission to traverse into directories
sudo chmod o+x /home/ubuntu
sudo chmod o+x "$PROJECT_ROOT"
sudo chmod o+x "$PROJECT_ROOT/apps"
sudo chmod o+x "$PROJECT_ROOT/apps/web"
echo "✅ Directory traversal permissions set"
echo ""

echo "📖 Setting read permissions on dist files..."
# Nginx needs read (r) permission to serve files
sudo chmod -R o+r "$DIST_PATH"
echo "✅ Read permissions set"
echo ""

echo "🗂️  Setting execute permissions on subdirectories..."
# All subdirectories need execute permission
sudo find "$DIST_PATH" -type d -exec chmod o+x {} \;
echo "✅ Subdirectory permissions set"
echo ""

# Display current permissions
echo "📊 Current permissions:"
echo "---"
ls -ld /home/ubuntu
ls -ld "$PROJECT_ROOT"
ls -ld "$PROJECT_ROOT/apps/web"
ls -ld "$DIST_PATH"
echo "---"
echo ""

# Test if Nginx user can read the file
echo "🧪 Testing Nginx user access..."
NGINX_USER="www-data"

# Check if www-data user exists, otherwise try nginx
if ! id -u $NGINX_USER > /dev/null 2>&1; then
    NGINX_USER="nginx"
fi

if ! id -u $NGINX_USER > /dev/null 2>&1; then
    echo "⚠️  Warning: Neither 'www-data' nor 'nginx' user found."
    echo "Cannot test Nginx user access."
    echo "Permissions have been set, but manual testing required."
else
    if sudo -u $NGINX_USER cat "$DIST_PATH/index.html" > /dev/null 2>&1; then
        echo "✅ Success! Nginx user ($NGINX_USER) can read the files"
    else
        echo "❌ Failed! Nginx user ($NGINX_USER) still cannot read the files"
        echo ""
        echo "Possible solutions:"
        echo "1. Move files to /var/www/ (standard location)"
        echo "2. Add $NGINX_USER to ubuntu group: sudo usermod -a -G ubuntu $NGINX_USER"
        echo "3. Check SELinux/AppArmor restrictions"
        exit 1
    fi
fi
echo ""

# Restart Nginx
echo "🔄 Restarting Nginx..."
if sudo systemctl restart nginx; then
    echo "✅ Nginx restarted successfully"
else
    echo "❌ Failed to restart Nginx"
    echo "Check: sudo systemctl status nginx"
    exit 1
fi
echo ""

# Final status check
echo "📊 Nginx status:"
sudo systemctl status nginx --no-pager | head -n 5
echo ""

echo "✨ Done! Permissions fixed."
echo ""
echo "🧪 Test your site now at: https://quiz.utkarshjoshi.com"
echo ""
echo "📝 To monitor errors, run:"
echo "   sudo tail -f /var/log/nginx/error.log"
echo ""
echo "💡 If you rebuild the frontend, run this script again to fix permissions."

