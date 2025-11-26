# WebSocket Nginx Setup Guide (Host-Level)

This guide explains how to configure nginx on your host server to proxy WebSocket connections to the Go socket service running directly on port 5001.

## Prerequisites

- Nginx installed on the host: `sudo apt install nginx`
- Certbot installed: `sudo apt install certbot python3-certbot-nginx`
- Go socket service running on `localhost:5001`

## Step 1: Add Map Directive to Main Nginx Config

The WebSocket proxy requires a `map` directive to handle the `Connection` header dynamically. Add this to `/etc/nginx/nginx.conf`:

```bash
sudo nano /etc/nginx/nginx.conf
```

Inside the `http {}` block (usually near the top), add:

```nginx
http {
    # ... existing config ...
    
    # Map for WebSocket Connection header (must be before server blocks)
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }
    
    # ... rest of config ...
}
```

Save and exit.

## Step 2: Install WebSocket Configuration

1. Copy the socket config file:
   ```bash
   sudo cp infra/nginx-socket.conf /etc/nginx/sites-available/quiz-ws
   ```

2. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/quiz-ws /etc/nginx/sites-enabled/
   ```

3. Test the configuration:
   ```bash
   sudo nginx -t
   ```

   You should see:
   ```
   nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
   nginx: configuration file /etc/nginx/nginx.conf test is successful
   ```

## Step 3: Get SSL Certificate

1. Make sure your Go service is running on port 5001:
   ```bash
   # Check if service is listening
   sudo netstat -tlnp | grep 5001
   # OR
   sudo ss -tlnp | grep 5001
   ```

2. Ensure DNS is pointing to your server:
   ```bash
   # Verify DNS resolution
   dig quiz-ws.utkarshjoshi.com
   ```

3. Get SSL certificate with certbot:
   ```bash
   sudo certbot --nginx -d quiz-ws.utkarshjoshi.com
   ```

   Follow the prompts. Certbot will automatically modify the config file to add SSL certificates.

4. Test nginx configuration again:
   ```bash
   sudo nginx -t
   ```

## Step 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

## Step 5: Verify Setup

1. **Test WebSocket connection:**
   ```bash
   curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: test" \
     https://quiz-ws.utkarshjoshi.com/?token=YOUR_TOKEN
   ```

   You should see a `101 Switching Protocols` response.

2. **Test health endpoint:**
   ```bash
   curl https://quiz-ws.utkarshjoshi.com/health
   ```

3. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

## Troubleshooting

### Issue: "conflicting server name" warning

This means another nginx config already has `quiz-ws.utkarshjoshi.com`. Check:
```bash
grep -r "quiz-ws.utkarshjoshi.com" /etc/nginx/
```

Remove or comment out duplicate server blocks.

### Issue: 502 Bad Gateway

- Verify Go service is running: `curl http://127.0.0.1:5001/health`
- Check nginx error log: `sudo tail -f /var/log/nginx/error.log`
- Verify the service is listening on port 5001: `sudo ss -tlnp | grep 5001`

### Issue: WebSocket connection closes immediately

- Check that `proxy_buffering off;` is set
- Verify timeouts are long enough (7d = 7 days)
- Check Go service logs for errors

### Issue: Connection not upgrading to WebSocket

- Verify `proxy_set_header Upgrade $http_upgrade;` is present
- Check that `Connection $connection_upgrade;` uses the mapped variable
- Verify the `map` directive is in `/etc/nginx/nginx.conf` (not in server block)

## Configuration Summary

- **Domain:** `quiz-ws.utkarshjoshi.com`
- **Protocol:** WSS (WebSocket Secure)
- **Backend:** `http://127.0.0.1:5001/ws`
- **Client connects to:** `/?token=...`
- **Nginx proxies to:** `/ws?token=...` on the Go service

## Files Modified

- `/etc/nginx/nginx.conf` - Added map directive
- `/etc/nginx/sites-available/quiz-ws` - Socket server block
- `/etc/nginx/sites-enabled/quiz-ws` - Symlink to enabled config

