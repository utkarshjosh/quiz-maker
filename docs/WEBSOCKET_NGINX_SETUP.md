# WebSocket (WSS) Nginx Configuration Guide

## Problem

When connecting to `wss://quiz-ws.utkarshjoshi.com`, the backend socket service receives HTTP requests instead of WebSocket upgrade requests. This happens because nginx is not properly configured to handle WebSocket protocol upgrades.

## Root Cause

WebSocket connections require special nginx configuration to:
1. Upgrade the HTTP connection to WebSocket protocol
2. Forward the correct headers (`Upgrade` and `Connection`)
3. Disable buffering (WebSockets are bidirectional streams)
4. Set long timeouts (WebSocket connections persist)

Without these settings, nginx treats WebSocket connections as regular HTTP requests.

## Solution

### 1. Host-Level Nginx Configuration

The host-level nginx (running on EC2) needs to handle SSL termination and WebSocket proxying. Use the provided `infra/nginx-host.conf.example` file.

**Key WebSocket configuration requirements:**

```nginx
# Map to handle Connection header dynamically
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

location / {
    proxy_pass http://127.0.0.1:5001/ws;
    proxy_http_version 1.1;
    
    # CRITICAL: WebSocket upgrade headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    # CRITICAL: Disable buffering
    proxy_buffering off;
    
    # CRITICAL: Long timeouts (WebSockets are persistent)
    proxy_read_timeout 7d;
    proxy_send_timeout 7d;
}
```

### 2. Important Notes

1. **Path Mapping**: The client connects to root path `/?token=...`, but the Go service expects `/ws`. The nginx config handles this by proxying `/` to `/ws` on the backend.

2. **Port Mapping**: 
   - Container port: `5000` (socket service internal port)
   - Host port: `5001` (mapped in docker-compose.yml)
   - Nginx proxies to: `127.0.0.1:5001`

3. **SSL Termination**: The host-level nginx handles SSL (wss://), so the connection to the container is HTTP.

4. **Map Directive Location**: The `map $http_upgrade $connection_upgrade` directive must be in the `http` context, not inside `server` blocks. If using `sites-available/sites-enabled`, add it to `/etc/nginx/nginx.conf` in the `http` block, or at the top of your site config if it will be included.

### 3. Installation Steps

1. **Copy the configuration:**
   ```bash
   sudo cp infra/nginx-host.conf.example /etc/nginx/sites-available/quiz-maker
   ```

2. **Add the map directive to main nginx.conf:**
   
   Edit `/etc/nginx/nginx.conf` and add inside the `http` block:
   ```nginx
   http {
       # ... existing config ...
       
       # Map for WebSocket Connection header
       map $http_upgrade $connection_upgrade {
           default upgrade;
           '' close;
       }
       
       include /etc/nginx/sites-enabled/*;
   }
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/quiz-maker /etc/nginx/sites-enabled/
   ```

4. **Get SSL certificates:**
   ```bash
   sudo certbot --nginx -d quiz.utkarshjoshi.com -d quiz-api.utkarshjoshi.com -d quiz-ws.utkarshjoshi.com
   ```

5. **Test and reload:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 4. Verification

After configuring, test the WebSocket connection:

```bash
# Test WebSocket upgrade (should return 101 Switching Protocols)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://quiz-ws.utkarshjoshi.com/?token=YOUR_TOKEN
```

### 5. Troubleshooting

**Issue: Still receiving HTTP requests instead of WebSocket**

- Check that `proxy_set_header Upgrade $http_upgrade;` is present
- Verify `Connection $connection_upgrade;` uses the mapped variable
- Ensure `proxy_buffering off;` is set
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

**Issue: Connection closes immediately**

- Verify timeouts are set to long values (7d for persistent connections)
- Check that the Go service is accepting connections on `/ws` endpoint
- Verify the token is being passed correctly in the query string

**Issue: 502 Bad Gateway**

- Verify the socket container is running: `docker compose ps`
- Check the container is accessible: `curl http://127.0.0.1:5001/health`
- Verify port mapping in docker-compose.yml matches nginx config

## Reference

- [Nginx WebSocket Proxying](https://nginx.org/en/docs/http/websocket.html)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)

