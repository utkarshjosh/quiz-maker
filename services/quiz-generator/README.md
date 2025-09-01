# Quiz Generator Agent Service

A conversational AI-powered quiz generation service built with LangGraph and LangChain, using Groq's fast inference for real-time quiz generation. Enables users to create, refine, and interact with quizzes through natural language conversations.

## 🧠 Agent Architecture

### Core Components

1. **LangGraph Agent Workflow**
   - State-based conversation management
   - Tool integration and orchestration
   - Conditional routing based on user intent

2. **Agent Tools**
   - `generate_quiz` - Create comprehensive quizzes
   - `analyze_prompt` - Break down topics into subtopics
   - `save_quiz` - Persist quiz data to Redis
   - `get_quiz` - Retrieve quiz data
   - `tavily_search` - Web search for current information (placeholder)
   - `knowledge_search` - Internal knowledge base search (placeholder)

3. **Thread-based Persistence**
   - Redis-based conversation threads
   - 24-hour expiry with automatic extension
   - Context and quiz history per thread

### Directory Structure

```
src/agents/
├── agents/
│   └── quizMaker.js          # Main QuizMaker agent
├── tools/
│   ├── index.js              # Tool exports
│   ├── generateQuiz.js       # Quiz generation tool
│   ├── analyzePrompt.js      # Topic analysis tool
│   ├── saveQuiz.js           # Quiz persistence tool
│   ├── getQuiz.js            # Quiz retrieval tool
│   ├── tavilySearch.js       # Web search tool (facade)
│   └── knowledgeSearch.js    # Knowledge base search (facade)
├── prompts/
│   └── system.js             # System prompts for different tasks
├── utils/
│   └── threadPersistence.js  # Redis-based thread management
└── index.js                  # Agent service interface
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ 
- Redis server running locally or remotely
- Groq API key (free tier available at groq.com)

### Environment Variables

Create a `.env` file:

```env
# Groq Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Optional: Tavily Search (for web search)
TAVILY_API_KEY=your_tavily_api_key_here

# Service Configuration
PORT=3001
NODE_ENV=development
```

### Installation

```bash
npm install
```

### Running the Service

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Chat Interface (Primary)

**POST `/chat`**
- Primary endpoint for conversational quiz generation
- Supports thread-based conversations
- Returns markdown-formatted quizzes

```json
{
  "message": "Create a quiz about JavaScript fundamentals",
  "threadId": "optional-thread-id"
}
```

### Legacy Support

**POST `/generate`**
- Legacy endpoint for direct quiz generation
- Automatically converted to chat format

### Thread Management

**GET `/thread/:threadId`**
- Get thread information

**GET `/thread/:threadId/history`**
- Get conversation history

**GET `/thread/:threadId/quizzes`**
- Get all quizzes created in the thread

## 🎯 Usage Examples

### Simple Quiz Generation

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a 5-question quiz about Python basics with medium difficulty"
  }'
```

### Conversation Continuation

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Make the quiz harder and add 3 more questions",
    "threadId": "thread-id-from-previous-response"
  }'
```

### Quiz Refinement

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you improve question 2 and add more detailed explanations?",
    "threadId": "existing-thread-id"
  }'
```

## 🔧 Features

### Conversational Interface
- Natural language quiz generation
- Context-aware responses
- Follow-up questions and refinements
- Thread-based conversation persistence

### Intelligent Quiz Generation
- Topic analysis and subtopic breakdown
- Adaptive difficulty levels
- Comprehensive question formats
- Detailed explanations and categorization

### Markdown Output
- Beautiful, readable quiz formatting
- Structured question layout
- Answer explanations
- Category organization

### Extensible Architecture
- Modular tool system
- Easy to add new capabilities
- Facade pattern for external integrations
- Clean separation of concerns

## 🏗️ Architecture Philosophy

This implementation follows a **clean, extensible agent architecture** designed for:

1. **Scalability** - Easy to add new tools and capabilities
2. **Maintainability** - Clear separation of concerns
3. **Flexibility** - Conversational interface adapts to various use cases
4. **Persistence** - Thread-based context management
5. **Integration** - Facade patterns for external services

The architecture is intentionally **simple yet powerful**, avoiding complexity while maintaining the ability to grow and adapt to future requirements.

## 🚧 Development Notes

### Adding New Tools

1. Create tool file in `src/agents/tools/`
2. Export tool in `src/agents/tools/index.js`
3. Tool will be automatically available to the agent

### Adding New Agents

1. Create agent file in `src/agents/agents/`
2. Export agent in `src/agents/index.js`
3. Add service methods as needed

### Extending Prompts

1. Add new prompts to `src/agents/prompts/system.js`
2. Reference in tools or agents as needed

## 📈 Future Enhancements

- [ ] Real Tavily API integration
- [ ] Vector database knowledge search
- [ ] Multi-modal quiz generation (images, audio)
- [ ] Advanced quiz analytics
- [ ] User preference learning
- [ ] Collaborative quiz editing
- [ ] Integration with learning management systems

## 🔍 Monitoring

The service includes comprehensive logging:
- Agent conversation flows
- Tool execution results
- Redis operations
- Error tracking and debugging

Monitor the console output for detailed operation logs and debugging information. 