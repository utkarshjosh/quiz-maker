# API Gateway Service Architecture Plan

## Overview
The API Gateway service acts as the **user integration backend** that orchestrates the entire quiz system. It manages user authentication, quiz lifecycle, hosting, and database persistence while delegating quiz generation to the specialized `quiz-generator` service.

## Core Architecture Principles

### 1. **Service Orchestration**
- **Stateful User Management**: Maintains user sessions and context
- **Database Persistence**: Handles all permanent data storage
- **Service Delegation**: Calls `quiz-generator` for quiz creation logic
- **Context Management**: Provides historical thread context to services

### 2. **User-Centric Design**
- Every operation is tied to a user ID
- User owns their quizzes, threads, and hosting sessions
- Fine-grained permissions and access control

## System Components

### 1. **Authentication & User Management**
```
/auth
├── signup (POST)
├── login (POST)
├── logout (POST)
├── refresh (POST)
├── profile (GET/PUT)
└── forgot-password (POST)
```

**Features:**
- JWT-based authentication
- Password hashing with bcrypt
- Email verification
- Password reset functionality
- User profile management

### 2. **Quiz Creation & Management**
```
/quizzes
├── create (POST) - Start new quiz creation
├── /:quizId (GET/PUT/DELETE) - CRUD operations
├── /:quizId/versions (GET) - Version history
├── /:quizId/duplicate (POST) - Clone existing quiz
├── /:quizId/publish (POST) - Make quiz public
└── /my-quizzes (GET) - User's quiz library
```

**Quiz Creation Flow:**
1. User starts quiz creation → Creates thread in `quiz-generator`
2. User chats with agent → Proxies to `quiz-generator`
3. Quiz generated → Saved in database with user ownership
4. User can modify/refine → Updates both DB and agent context
5. User publishes → Makes quiz available for hosting

### 3. **Quiz Hosting & Participation**
```
/hosting
├── /host (POST) - Create hosting session
├── /sessions (GET) - User's hosting sessions
├── /sessions/:sessionId (GET) - Session details
├── /sessions/:sessionId/start (POST) - Start session
├── /sessions/:sessionId/end (POST) - End session
├── /sessions/:sessionId/results (GET) - Session results
└── /join/:sessionCode (POST) - Join session
```

**Hosting Flow:**
1. User creates hosting session → Generates unique session code
2. Session configuration (time limits, participant limits, etc.)
3. Participants join via session code
4. Host starts session → Triggers real-time quiz flow
5. Real-time interaction via WebSocket
6. Results aggregation and storage

### 4. **Thread Management & Context**
```
/threads
├── /:threadId (GET) - Get thread details
├── /:threadId/history (GET) - Conversation history
├── /:threadId/extend (POST) - Extend thread life
├── /:threadId/import (POST) - Import old thread to new session
└── /my-threads (GET) - User's thread history
```

**Context Management:**
- Store thread history in database permanently
- Provide old thread context to `quiz-generator` when needed
- Allow users to resume old conversations
- Export/import thread context between sessions

## Database Schema

### 1. **User Management Tables**
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  profile_data JSONB DEFAULT '{}'
);

-- User sessions for JWT management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  device_info JSONB DEFAULT '{}'
);
```

### 2. **Quiz Management Tables**
```sql
-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50) DEFAULT 'medium',
  time_limit INTEGER DEFAULT 1800, -- seconds
  total_questions INTEGER NOT NULL,
  quiz_data JSONB NOT NULL, -- Full quiz content
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  version INTEGER DEFAULT 1
);

-- Quiz versions for history tracking
CREATE TABLE quiz_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  quiz_data JSONB NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);
```

### 3. **Thread Management Tables**
```sql
-- Threads table
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  redis_thread_id VARCHAR(255), -- Link to Redis thread
  title VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, completed, archived
  quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  context_data JSONB DEFAULT '{}'
);

-- Thread messages for permanent storage
CREATE TABLE thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sequence_number INTEGER NOT NULL
);
```

### 4. **Hosting & Participation Tables**
```sql
-- Hosting sessions
CREATE TABLE hosting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  session_code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  max_participants INTEGER DEFAULT 50,
  status VARCHAR(50) DEFAULT 'created', -- created, active, ended
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Session participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES hosting_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(100) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'joined' -- joined, active, completed, left
);

-- Session results
CREATE TABLE session_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES hosting_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES session_participants(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  user_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN,
  time_taken INTEGER, -- milliseconds
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Service Integration Architecture

### 1. **Quiz Generator Integration**
```javascript
// Service client for quiz-generator
class QuizGeneratorClient {
  async createQuizSession(userId, message) {
    // Call quiz-generator to start new session
    const response = await fetch(`${QUIZ_GENERATOR_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    // Store thread mapping in database
    await this.storeThreadMapping(userId, response.threadId);
    
    return response;
  }
  
  async continueQuizSession(userId, threadId, message) {
    // Get thread context from database
    const context = await this.getThreadContext(userId, threadId);
    
    // Call quiz-generator with historical context
    const response = await fetch(`${QUIZ_GENERATOR_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        threadId,
        context: context // Provide historical context
      })
    });
    
    // Store conversation in database
    await this.storeConversation(userId, threadId, message, response.response);
    
    return response;
  }
}
```

### 2. **Real-time Service Integration**
```javascript
// Service client for real-time websocket service
class RealtimeServiceClient {
  async createQuizSession(sessionId, quizData) {
    // Initialize quiz session in Go websocket service
    await fetch(`${REALTIME_SERVICE_URL}/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        quiz: quizData,
        callback: `${API_GATEWAY_URL}/webhook/quiz-results`
      })
    });
  }
  
  async broadcastToSession(sessionId, message) {
    // Send message to all participants in session
    await fetch(`${REALTIME_SERVICE_URL}/session/${sessionId}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Basic Express.js setup with TypeScript
- [ ] Database setup with PostgreSQL
- [ ] User authentication system
- [ ] JWT token management
- [ ] Basic user registration/login

### Phase 2: Quiz Management (Week 3-4)
- [ ] Quiz CRUD operations
- [ ] Integration with quiz-generator service
- [ ] Thread management and context storage
- [ ] Quiz versioning system
- [ ] User quiz library

### Phase 3: Hosting System (Week 5-6)
- [ ] Hosting session management
- [ ] Session code generation
- [ ] Participant management
- [ ] Integration with real-time service
- [ ] Result aggregation

### Phase 4: Advanced Features (Week 7-8)
- [ ] Advanced analytics
- [ ] Quiz sharing and collaboration
- [ ] Performance optimization
- [ ] API rate limiting
- [ ] Monitoring and logging

## Technology Stack

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod for request validation
- **Testing**: Jest for unit tests
- **Documentation**: Swagger/OpenAPI

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Environment**: Environment-based configuration
- **Monitoring**: Winston for logging
- **Health Checks**: Built-in health endpoints

## Security Considerations

1. **Authentication**
   - JWT tokens with short expiration
   - Refresh token rotation
   - Password strength validation
   - Rate limiting on auth endpoints

2. **Authorization**
   - Role-based access control
   - Resource ownership validation
   - API key management for service-to-service calls

3. **Data Protection**
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection
   - CORS configuration

4. **Privacy**
   - User data encryption
   - Secure session management
   - Audit logging for sensitive operations

## Scalability Strategy

1. **Database Optimization**
   - Proper indexing strategy
   - Query optimization
   - Connection pooling
   - Read replicas for heavy queries

2. **Caching Strategy**
   - Redis for session storage
   - Application-level caching
   - CDN for static assets

3. **Service Architecture**
   - Microservice communication
   - Load balancing
   - Circuit breaker pattern
   - Graceful degradation

## Monitoring & Observability

1. **Metrics**
   - API response times
   - Error rates
   - User activity patterns
   - Quiz performance metrics

2. **Logging**
   - Structured logging
   - Centralized log aggregation
   - Error tracking
   - Audit trails

3. **Health Checks**
   - Service health endpoints
   - Database connectivity
   - External service dependencies
   - Performance benchmarks

This architecture provides a solid foundation for building a scalable, secure, and maintainable quiz platform that can grow with user needs while maintaining clean separation of concerns between services. 