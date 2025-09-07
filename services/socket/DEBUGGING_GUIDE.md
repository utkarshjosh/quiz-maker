# WebSocket Debugging Guide

This guide helps you debug the React-Go socket integration issues.

## 🚨 Current Issues Identified

1. **Constructor Mismatch**: Fixed - `NewWebSocketGateway` now properly accepts 3 parameters
2. **Insufficient Logging**: Fixed - Added comprehensive logging throughout the WebSocket service
3. **No Database Testing**: Fixed - Created database connection test script
4. **No Debug Interface**: Fixed - Created interactive WebSocket debug client

## 🛠️ Debugging Tools Available

### 1. Database Connection Test

```bash
cd services/socket
go run scripts/test_db_connection.go
```

This will:

- Test database connectivity
- Check if required tables exist
- Count records in key tables
- Test query syntax
- Display sample data

### 2. WebSocket Debug Client

```bash
cd services/socket
go run scripts/websocket_debug_client.go ws://localhost:5000/ws
```

This interactive client allows you to:

- Send ping messages
- Test join room functionality
- Test create room functionality
- Send custom messages
- View real-time responses

### 3. Automated Test Script

```bash
cd services/socket
./scripts/run_tests.sh
```

This runs all tests and provides guidance.

## 🔍 Debugging Process

### Step 1: Test Database Connection

```bash
cd services/socket
go run scripts/test_db_connection.go
```

**Expected Output:**

```
✅ Database connection established successfully
✅ Database version: PostgreSQL 15.x
✅ quiz_rooms table exists: true
✅ quizzes table exists: true
✅ Quiz count: X
✅ Quiz room count: Y
```

**If Database Test Fails:**

1. Check your `.env` file has correct `DATABASE_URL`
2. Ensure PostgreSQL is running
3. Verify database credentials
4. Check if tables exist (run Prisma migrations)

### Step 2: Start WebSocket Server

```bash
cd services/socket
go run cmd/main.go
```

**Expected Output:**

```
INFO    Starting Quiz Realtime Service
INFO    Starting server
INFO    WebSocket connection attempt
```

**If Server Fails to Start:**

1. Check `.env` file for required variables
2. Verify database connection
3. Check if port 5000 is available
4. Review error logs

### Step 3: Test WebSocket Connection

```bash
# In another terminal
cd services/socket
go run scripts/websocket_debug_client.go ws://localhost:5000/ws
```

**Expected Flow:**

1. Client connects successfully
2. Server logs show connection establishment
3. You can send test messages
4. Server responds appropriately

### Step 4: Test with React Frontend

1. Start your React development server
2. Open browser developer tools
3. Navigate to WebSocket connection page
4. Monitor both browser console and server logs

## 📊 Logging Levels

The server now includes detailed logging at different levels:

### Debug Level (Development)

- Raw message data
- Message parsing details
- Connection lifecycle events
- Database query details

### Info Level (Production)

- Connection establishment
- Message processing
- Room operations
- Error conditions

### Warning Level

- Authentication failures
- Invalid message formats
- Room not found errors

### Error Level

- Database connection failures
- WebSocket write errors
- Critical system errors

## 🔧 Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/quiz_maker
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=your-audience

# Optional
LOG_LEVEL=debug  # Enable debug logging
ENVIRONMENT=development
SERVER_ADDRESS=:5000
REDIS_ADDRESS=localhost:6379
```

### Log Configuration

- **Development**: Color output, debug level, stack traces
- **Production**: JSON output, info level, no stack traces

## 🐛 Common Issues & Solutions

### Issue: "Failed to connect to database"

**Solution:**

1. Check `DATABASE_URL` in `.env`
2. Ensure PostgreSQL is running
3. Verify database exists
4. Check network connectivity

### Issue: "WebSocket authentication failed"

**Solution:**

1. Check Auth0 configuration
2. Verify JWT token in request headers
3. Check Auth0 service implementation
4. Review authentication logs

### Issue: "Room not found"

**Solution:**

1. Check if room exists in database
2. Verify PIN format (6 digits)
3. Check room status (not closed)
4. Review room lookup logic

### Issue: "Invalid message format"

**Solution:**

1. Check message structure matches protocol
2. Verify JSON formatting
3. Check required fields are present
4. Review message validation logic

## 📈 Performance Monitoring

### Key Metrics to Monitor

- WebSocket connection count
- Message processing latency
- Database query performance
- Memory usage
- Error rates

### Log Analysis

```bash
# Filter WebSocket logs
grep "websocket" service.log

# Filter error logs
grep "ERROR" service.log

# Filter by user ID
grep "user_id=123" service.log
```

## 🚀 Next Steps

1. **Run Database Test**: Verify database connectivity
2. **Start Server**: Check server starts without errors
3. **Test WebSocket**: Use debug client to test basic functionality
4. **Test React Integration**: Connect React frontend
5. **Monitor Logs**: Watch for errors and performance issues
6. **Iterate**: Fix issues and test again

## 📝 Debugging Checklist

- [ ] Database connection test passes
- [ ] Server starts without errors
- [ ] WebSocket debug client connects
- [ ] Ping/pong messages work
- [ ] Room creation works
- [ ] Room joining works
- [ ] React frontend connects
- [ ] Messages flow both ways
- [ ] Error handling works
- [ ] Logging provides useful information

## 🆘 Getting Help

If you're still experiencing issues:

1. **Check Logs**: Review server logs for error details
2. **Test Components**: Use debug tools to isolate issues
3. **Verify Configuration**: Ensure all environment variables are correct
4. **Check Dependencies**: Ensure all services are running
5. **Review Code**: Check for recent changes that might have broken functionality

Remember: The detailed logging should now provide clear information about what's happening at each step of the WebSocket communication process.
