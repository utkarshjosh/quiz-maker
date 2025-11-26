# OAuth 502 Error Fix Guide

## Problem Summary

After Auth0 redirect in production, the first callback request returns a **502 Bad Gateway** error from Nginx. On refresh, it works but the token has already expired.

## Root Cause

The OAuth `afterCallback` was performing **synchronous database operations** (`await userService.findOrCreateUser()`) which caused the request to timeout before responding. This triggered Nginx 502 errors.

## Fixes Implemented

### ✅ Fix 1: Move Database Operations to Background

**File:** `apps/api/src/middlewares/oauth.middleware.ts`

- Changed `afterCallback` to use `setImmediate()` for database operations
- The callback now responds immediately without waiting for user creation
- User creation happens asynchronously in the background
- Prevents timeout and 502 errors

**Before:**
```typescript
// Blocking - waits for database
const dbUser = await userService.findOrCreateUser({...});
return session;
```

**After:**
```typescript
// Non-blocking - returns immediately
setImmediate(async () => {
  const dbUser = await userService.findOrCreateUser({...});
  console.log('✅ Background: User created/updated');
});
return session; // Responds immediately
```

### ✅ Fix 2: Enhanced Error Logging

**File:** `apps/api/src/middlewares/error-handler.ts`

- Added detailed error context logging (URL, method, headers)
- Added check to prevent double response errors
- Better console logging for OAuth callback errors

### ✅ Fix 3: Updated Nginx Configuration

**File:** `infra/nginx.conf`

Added critical headers and timeouts:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    
    # CRITICAL: Headers for OAuth callbacks
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;  # CRITICAL
    proxy_set_header X-Forwarded-Host $host;
    
    # Important for OAuth callbacks
    proxy_redirect off;
    proxy_buffering off;
    
    # Increase timeouts - prevents 502 errors
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Increase buffer sizes
    proxy_buffer_size 16k;
    proxy_buffers 8 16k;
    proxy_busy_buffers_size 32k;
}
```

### ✅ Fix 4: Trust Proxy Already Configured

**File:** `apps/api/src/app.ts` (lines 33-38)

Express is already configured to trust the proxy:

```typescript
if (environment.isProd() || environment.isStage()) {
  this.express.set('trust proxy', 1);
}
```

### ✅ Fix 5: Redis Session Store (Optional but Recommended)

**Files:** 
- `apps/api/src/lib/session.config.ts` (new)
- `apps/api/src/app.ts` (updated)

Created a session configuration that automatically uses Redis in production:

- **Development:** Uses memory store (simple, no setup needed)
- **Production:** Uses Redis store (persistent, survives restarts)

## Deployment Steps

### 1. Update Nginx Configuration

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, restart nginx
sudo systemctl restart nginx
```

### 2. Restart the API Server

```bash
# If using PM2
pm2 restart all

# Or restart directly
npm run start
```

### 3. Clear Browser Cookies

**Important:** Clear all cookies for your domain before testing.

### 4. Test the Auth Flow

1. Navigate to your login page
2. Click "Login with Auth0"
3. Complete Auth0 authentication
4. **Should redirect successfully without 502 error**

## Optional: Add Redis Session Store

For production, it's **highly recommended** to use Redis for session storage.

### Install Dependencies

```bash
cd apps/api
npm install connect-redis redis
```

### Set Environment Variable

Add to your `.env` or production environment:

```bash
REDIS_URL=redis://localhost:6379
# Or for remote Redis:
# REDIS_URL=redis://username:password@host:port
```

### Verify Redis Connection

After restarting the API, check logs:

```bash
# You should see:
🔴 Initializing Redis session store...
✅ Redis session store connected
✅ Redis session store configured
```

If Redis is not available, the app will automatically fall back to memory store with a warning.

## Verification Checklist

- [ ] Nginx configuration updated with headers and timeouts
- [ ] Nginx test passed (`sudo nginx -t`)
- [ ] Nginx restarted (`sudo systemctl restart nginx`)
- [ ] API server restarted (`pm2 restart all`)
- [ ] Browser cookies cleared
- [ ] OAuth login tested successfully
- [ ] No 502 errors on first callback
- [ ] User created in database (check logs)
- [ ] Profile endpoint returns user data

## Monitoring

### Check API Logs

```bash
# If using PM2
pm2 logs api

# Look for these logs during OAuth:
# 🔐 afterCallback triggered
# 🍪 Setting JWT cookie with: id_token
# ⚡ Callback responding immediately (user creation in background)
# 📝 Background: Processing user from id_token
# ✅ Background: User created/updated successfully
```

### Check Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Still Getting 502 Errors?

1. **Check if Express is running:**
   ```bash
   curl http://localhost:3000
   ```

2. **Check Nginx proxy_pass:**
   - Ensure it points to correct port (3000)
   - Verify Express is listening on that port

3. **Check firewall rules:**
   ```bash
   sudo ufw status
   ```

4. **Check Express logs for errors:**
   ```bash
   pm2 logs api --err
   ```

### User Not Created in Database?

Check background logs:
```bash
pm2 logs api | grep "Background:"
```

If you see errors, the user creation failed but the redirect still worked (as intended). Check:
- Database connection
- Prisma schema matches database
- Auth0 id_token contains user data

### Token Expired on Refresh?

This should no longer happen because:
- Callback responds immediately (no timeout)
- Cookie is set before redirect
- Token is valid for 24 hours

If still happening:
- Check browser cookie settings
- Verify cookie `secure` flag matches HTTPS usage
- Check `sameSite` cookie attribute

## Performance Improvements

### Background User Creation

**Pros:**
- ✅ Immediate redirect (no waiting)
- ✅ No 502 errors
- ✅ Better user experience

**Cons:**
- ⚠️ User might not be in database immediately after redirect
- ⚠️ Need to handle user lookup gracefully on first API call

**Mitigation:**
The first API call after login will ensure the user exists. If not, it returns a helpful error asking them to refresh or re-login.

### Redis Session Store

**Pros:**
- ✅ Sessions persist across server restarts
- ✅ Better for multi-server deployments
- ✅ Faster than database-backed sessions
- ✅ Can share sessions between services

**Cons:**
- ⚠️ Requires Redis setup and maintenance
- ⚠️ Additional infrastructure dependency

## Summary

The main fix is **moving database operations to background** in the OAuth callback. This prevents the request from timing out and causing 502 errors.

The other changes (Nginx config, error logging, Redis sessions) are enhancements that improve reliability and observability.

**Key Takeaway:** OAuth callbacks should respond immediately and perform expensive operations (database writes, API calls) in the background.

