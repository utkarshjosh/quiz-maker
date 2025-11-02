# Authentication Issues - Fixed 🎉

## Issues Identified and Resolved

### 1. ❌ **JWT Token Issue: Using access_token instead of id_token**
**Problem:** The OAuth middleware was setting the `access_token` as the cookie. Auth0 access tokens only contain minimal claims (sub, aud, scope) and **do not include user profile information** like email, name, and picture.

**Solution:** Modified `oauth.middleware.ts` to prioritize `id_token` over `access_token` when setting the authentication cookie. ID tokens contain complete user profile data.

**Changes:**
- `apps/api/src/middlewares/oauth.middleware.ts` line 100-106
- Now uses `id_token || access_token` (prefers id_token)
- Added logging to show which token type is being used

### 2. ❌ **User Creation Failures Were Silent**
**Problem:** The `afterCallback` function was calling `findOrCreateUser()` but not properly handling or logging errors. When user creation failed, it would fail silently, leaving no user in the database.

**Solution:** Wrapped user creation in try-catch with comprehensive error logging. Now errors are logged clearly with context about what went wrong.

**Changes:**
- `apps/api/src/middlewares/oauth.middleware.ts` line 110-143
- Added detailed console logging at each step
- Logs successful user creation with database ID
- Logs failures prominently with error details

### 3. ❌ **Profile Endpoint Returned Fallback Data**
**Problem:** When users weren't in the database, the profile endpoint would return incomplete JWT data (from access_token) as fallback, showing "Not provided" for most fields.

**Solution:** Modified profile endpoint to return proper error when user is not in database, with helpful message to re-login.

**Changes:**
- `apps/api/src/modules/auth/auth.controller.ts` getProfile() line 17-94
- Now returns 404 with clear error message
- Provides `needsRelogin: true` flag
- No more fallback to incomplete data

### 4. ❌ **WebSocket Token Generation Didn't Check Database**
**Problem:** WebSocket token generation was using JWT claims directly, which might not have complete data.

**Solution:** Modified to fetch user from database first, ensuring complete data is in the WebSocket token.

**Changes:**
- `apps/api/src/modules/auth/auth.controller.ts` getWebSocketToken() line 297-369
- Fetches user from database before generating token
- Returns 404 with helpful message if user not in database
- Ensures Go socket service gets complete user data

### 5. ✅ **JWT Service Now Handles Missing Data**
**Problem:** JWT service assumed email would always be present in tokens.

**Solution:** Made email/name/picture optional in MinimalUserData interface and added warning logs when data is missing.

**Changes:**
- `apps/api/src/lib/jwt.service.ts` line 5-13, 110-128
- Made email/email_verified optional in interface
- Added warning log when email is missing (indicates access_token)

## Testing Instructions

### Step 1: Clear Everything and Start Fresh
```bash
# 1. Clear your browser cookies for localhost
# - Open DevTools > Application > Cookies > localhost:5173
# - Delete all cookies

# 2. Restart the backend
cd apps/api
npm run dev
```

### Step 2: Test New Login Flow
1. Go to http://localhost:5173
2. Click "Login"
3. Complete OAuth flow with Auth0
4. Watch the backend console for:
   ```
   🔐 afterCallback triggered: { hasAccessToken: true, hasIdToken: true, hasOidcUser: true }
   🍪 Setting JWT cookie with: id_token
   📝 Creating/updating user in database: { sub: '...', email: '...', name: '...' }
   ✅ User created/updated successfully: { id: '...', email: '...', auth0Id: '...' }
   ```

### Step 3: Verify Profile Data
1. Navigate to Profile page
2. Should see complete user data (not fallbacks)
3. Backend console should show:
   ```
   👤 Profile request for user: { sub: '...', hasEmail: true }
   ✅ Profile fetched successfully: { id: '...', email: '...' }
   ```

### Step 4: Check Database
```bash
# Connect to your database and verify user exists
# Example with Prisma Studio:
npx prisma studio
# Check Users table - should see your user with all fields populated
```

### Step 5: Test WebSocket Token (if applicable)
```bash
# Make a request to get WebSocket token
curl http://localhost:3000/api/v1/development/auth/websocket-token \
  -H "Cookie: access_token=YOUR_TOKEN" \
  --cookie-jar -

# Should return token with complete user data
# Backend console should show user fetched from database
```

## What Should Happen Now

### ✅ New Logins
- User clicks login → Auth0 OAuth flow
- Backend receives callback with id_token
- `afterCallback` creates/updates user in Postgres database
- User profile has complete data (email, name, picture, etc.)
- Go socket service can verify user exists in database

### ✅ Existing Sessions
- If you logged in before the fix, your session has an access_token
- You'll need to **log out and log in again** to get an id_token
- After re-login, everything will work correctly

### ✅ Profile Page
- Shows complete user information from database
- No more "Not provided" fallbacks
- If user not in DB, shows clear error message

### ✅ WebSocket Authentication
- Backend generates token with complete user data from database
- Go socket service can verify user exists
- Token includes email, name, picture

## Common Issues After Fix

### "User not found in database" error
**Cause:** You're using an old session from before the fix
**Solution:** Log out completely and log in again

### Still seeing incomplete data
**Cause:** Browser cached old profile data
**Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

### Backend console shows "access_token" being used
**Cause:** Auth0 might not be returning id_token
**Solution:** Check Auth0 dashboard → Applications → Settings → ensure id_token is included in responses

## Files Modified

1. `apps/api/src/middlewares/oauth.middleware.ts` - OAuth callback and JWT middleware
2. `apps/api/src/modules/auth/auth.controller.ts` - Profile and WebSocket token endpoints
3. `apps/api/src/lib/jwt.service.ts` - JWT token extraction and validation

## Key Takeaways

1. **Always use id_token for user profile data**, not access_token
2. **Always log errors** in OAuth callbacks - silent failures are hard to debug
3. **Always validate database state** - don't assume users exist
4. **Provide clear error messages** to users when things go wrong
5. **Test with fresh sessions** after authentication changes

## Next Steps

The backend is now fixed. To test the complete flow:

1. Clear all cookies and sessions
2. Log out from Auth0 (if logged in)
3. Restart backend server
4. Perform fresh login
5. Check backend console for success logs
6. Verify user in database
7. Test profile page
8. Test WebSocket token generation (if using sockets)
