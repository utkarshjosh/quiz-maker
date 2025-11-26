# 🚀 Production Deployment Checklist

## Quick Fix for 502 OAuth Errors

### ✅ Changes Made

All necessary code changes have been implemented:

1. **OAuth Middleware** - Database operations now run in background
2. **Error Handler** - Enhanced logging for better debugging
3. **Nginx Config** - Updated with proper headers and timeouts
4. **Session Store** - Ready for Redis (optional but recommended)

### 📋 Deployment Steps

#### 1. Update Code on Server

```bash
# Pull latest changes
git pull origin main

# Install dependencies (if needed)
cd apps/api
npm install
```

#### 2. Update Nginx Configuration

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/quiz-api.utkarshjoshi.com /etc/nginx/sites-available/quiz-api.utkarshjoshi.com.backup

# Copy new config
sudo cp infra/nginx.conf /etc/nginx/sites-available/quiz-api.utkarshjoshi.com

# Or manually update the location block with the changes from infra/nginx.conf

# Test configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx
```

#### 3. Restart API Server

```bash
# Restart all PM2 processes
pm2 restart all

# Or restart specific process
pm2 restart api

# Check logs
pm2 logs api --lines 50
```

#### 4. Clear Browser State

**Important:** Clear all cookies and cache for your domain before testing.

- Chrome: `Ctrl+Shift+Delete` → Select "All time" → Clear cookies and cached files
- Firefox: `Ctrl+Shift+Delete` → Select "Everything" → Clear cookies and cache

#### 5. Test OAuth Flow

1. Navigate to: `https://quiz.utkarshjoshi.com`
2. Click "Login with Auth0"
3. Complete authentication
4. **Expected:** Successful redirect without 502 error
5. Check browser DevTools Network tab for the callback request (should be 302 redirect, not 502)

#### 6. Verify Logs

Check that user creation happens in background:

```bash
pm2 logs api | grep "Background:"

# Should see:
# 📝 Background: Processing user from id_token
# ✅ Background: User created/updated successfully
```

### 🔴 Optional: Add Redis Session Store

For production-grade session management:

#### Install Dependencies

```bash
cd apps/api
npm install connect-redis redis
```

#### Set Environment Variable

Add to your `.env` file or environment:

```bash
REDIS_URL=redis://localhost:6379

# Or for remote Redis with authentication:
# REDIS_URL=redis://username:password@host:port
```

#### Restart and Verify

```bash
pm2 restart all
pm2 logs api | grep "Redis"

# Should see:
# 🔴 Initializing Redis session store...
# ✅ Redis session store connected
# ✅ Redis session store configured
```

If Redis connection fails, the app will automatically fall back to memory store with a warning.

### ⚠️ Troubleshooting

#### Still getting 502 errors?

1. Check Express is running:
   ```bash
   curl http://localhost:3000
   pm2 status
   ```

2. Check Nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. Verify Express logs:
   ```bash
   pm2 logs api --err
   ```

#### User not created in database?

```bash
# Check background logs
pm2 logs api | grep "Background:"

# Check database connection
npx prisma studio
```

#### Token expired after refresh?

This should no longer happen because:
- Callback responds immediately (no timeout)
- Cookie is set before redirect
- Token valid for 24 hours

If still happening, check:
- Browser cookie settings
- Cookie `secure` flag matches HTTPS
- `sameSite` cookie attribute is correct

### 📊 Monitoring

#### Watch Real-time Logs

```bash
# Watch OAuth flow
pm2 logs api | grep -E "afterCallback|Background|JWT cookie"

# Watch all errors
pm2 logs api --err

# Watch Nginx access logs
sudo tail -f /var/log/nginx/access.log | grep callback
```

#### Key Log Messages

✅ **Success:**
```
🔐 afterCallback triggered
🍪 Setting JWT cookie with: id_token
⚡ Callback responding immediately (user creation in background)
📝 Background: Processing user from id_token
✅ Background: User created/updated successfully
```

❌ **Problems:**
```
❌ Background: Failed to create/update user
❌ Express Error Handler:
502 Bad Gateway (in Nginx logs)
```

### 📚 Additional Documentation

- Full fix explanation: `docs/OAUTH_502_FIX_GUIDE.md`
- Auth implementation: `docs/auth/AUTH_FIX_SUMMARY.md`
- ADR: `docs/adr/006-oauth-authentication-implementation.md`

### ✨ What's Different?

**Before:**
- OAuth callback waited for database operations
- Request timeout → 502 error
- Token expired by the time of refresh

**After:**
- OAuth callback responds immediately
- User creation happens in background
- No timeout, no 502 error
- Token valid and cookie set properly

### 🎯 Success Criteria

- [ ] No 502 errors on OAuth callback
- [ ] Successful redirect after Auth0 login
- [ ] User created in database (check logs)
- [ ] Profile endpoint returns user data
- [ ] No "token expired" errors
- [ ] Background user creation logs appear

---

**Need Help?** Check logs with `pm2 logs api` and Nginx logs with `sudo tail -f /var/log/nginx/error.log`

