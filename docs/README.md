# Quiz Maker - Documentation

This directory contains comprehensive documentation for the quiz-maker project.

## 📂 Folder Structure

### `/architecture`
High-level architecture and implementation summaries:
- `IMPLEMENTATION_SUMMARY.md` - Complete overview of all features
- `FINAL_IMPLEMENTATION.md` - Final delivery summary
- `HOST_TRANSFER_COMPLETE.md` - Host transfer feature documentation

### `/frontend`
Frontend game architecture and implementation:
- `GAME_ARCHITECTURE.md` - Unity-style game architecture guide
- `QUICK_REFERENCE.md` - Quick reference for game system
- `REFACTOR_COMPLETE.md` - Frontend refactoring summary

### `/auth`
Authentication system documentation:
- `AUTH_FIX_SUMMARY.md` - Authentication fixes and OAuth implementation

### `/socket`
WebSocket service (Go) documentation:
- `CONNECTION_RULES.md` - WebSocket connection rules
- `FIXES_SUMMARY.md` - Socket service fixes
- `HOST_TRANSFER.md` - Host transfer implementation
- `IMPLEMENTATION_PLAN.md` - Socket service implementation plan
- `REJOIN_FIX.md` - Rejoin functionality fixes

## 🎯 Key Features Documented

### 1. Unity-Style Frontend Architecture
- Game Manager pattern
- Socket Manager for WebSocket communication
- Sound Engine integration
- Zustand state management
- Behavior-driven component design

### 2. Authentication System
- OAuth2 with Auth0
- ID token vs Access token handling
- Database persistence fixes
- Logout/Login flow improvements

### 3. WebSocket Service (Go)
- Host transfer functionality
- Lobby improvements
- Connection management
- Room state handling
- Rejoin functionality

## 📚 Related Documentation

- **Project ADRs**: See `/docs/adr` for architectural decision records
- **API Documentation**: See `/apps/api/README.md`
- **Frontend README**: See `/apps/web/README.md`
- **Socket Service**: See `/services/socket/README.md`

---

**Last Updated**: November 2025
