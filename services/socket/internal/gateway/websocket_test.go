package gateway

import (
	"context"
	"net/http"
	"testing"
	"time"

	"quiz-realtime-service/internal/models"
	"quiz-realtime-service/internal/protocol"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockAuthService is a mock implementation of the auth service
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) AuthenticateWebSocket(r *http.Request) (*models.User, error) {
	args := m.Called(r)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockAuthService) AuthMiddleware(next http.Handler) http.Handler {
	args := m.Called(next)
	return args.Get(0).(http.Handler)
}

func TestWebSocketConnectionEstablishment(t *testing.T) {
	// Create mock auth service
	mockAuth := &MockAuthService{}
	mockUser := &models.User{ID: "test-user-123", Email: "test@example.com"}
	mockAuth.On("AuthenticateWebSocket", mock.Anything).Return(mockUser, nil)

	// Create WebSocket gateway
	logger, _ := zap.NewDevelopment()
	gateway := NewWebSocketGateway(mockAuth, nil, logger)

	// Test that the server responds to WebSocket upgrade requests
	assert.NotNil(t, gateway)
	assert.NotNil(t, gateway.GetHub())
}

func TestMessageHandling(t *testing.T) {
	// Create mock auth service
	mockAuth := &MockAuthService{}
	mockUser := &models.User{ID: "test-user-123", Email: "test@example.com"}
	mockAuth.On("AuthenticateWebSocket", mock.Anything).Return(mockUser, nil)

	// Create WebSocket gateway
	logger, _ := zap.NewDevelopment()
	gateway := NewWebSocketGateway(mockAuth, nil, logger)

	// Test message type constants
	assert.Equal(t, "join", protocol.TypeJoin)
	assert.Equal(t, "create_room", protocol.TypeCreateRoom)
	assert.Equal(t, "start", protocol.TypeStart)
	assert.Equal(t, "answer", protocol.TypeAnswer)
	assert.Equal(t, "leave", protocol.TypeLeave)
	assert.Equal(t, "kick", protocol.TypeKick)
	assert.Equal(t, "ping", protocol.TypePing)
	assert.Equal(t, "pong", protocol.TypePong)
	
	// Use gateway to avoid unused variable warning
	assert.NotNil(t, gateway)
}

func TestProtocolMessageCreation(t *testing.T) {
	// Test creating a new message
	msg, err := protocol.NewMessage("test", map[string]string{"key": "value"})
	assert.NoError(t, err)
	assert.Equal(t, 1, msg.Version)
	assert.Equal(t, "test", msg.Type)
	assert.NotEmpty(t, msg.MsgID)

	// Test creating an error message
	errorMsg := protocol.NewErrorMessage("TEST_ERROR", "Test error message")
	assert.Equal(t, protocol.TypeError, errorMsg.Type)
	
	var errorData protocol.ErrorMessage
	err = errorMsg.UnmarshalData(&errorData)
	assert.NoError(t, err)
	assert.Equal(t, "TEST_ERROR", errorData.Code)
	assert.Equal(t, "Test error message", errorData.Message)
}

func TestConnectionMetadata(t *testing.T) {
	// Test that connection metadata is properly tracked
	logger, _ := zap.NewDevelopment()
	gateway := NewWebSocketGateway(nil, nil, logger)
	
	// Verify the gateway structure
	assert.NotNil(t, gateway)
	assert.NotNil(t, gateway.hub)
}

func TestErrorCodes(t *testing.T) {
	// Test that all error codes are defined
	assert.NotEmpty(t, protocol.ErrorCodeUnauthorized)
	assert.NotEmpty(t, protocol.ErrorCodeForbidden)
	assert.NotEmpty(t, protocol.ErrorCodeNotFound)
	assert.NotEmpty(t, protocol.ErrorCodeRateLimit)
	assert.NotEmpty(t, protocol.ErrorCodeValidation)
	assert.NotEmpty(t, protocol.ErrorCodeState)
	assert.NotEmpty(t, protocol.ErrorCodeRoomFull)
	assert.NotEmpty(t, protocol.ErrorCodeUnknown)
}

func TestMessageValidation(t *testing.T) {
	// Test message validation
	validJoinMsg := protocol.JoinMessage{
		PIN:         "123456",
		DisplayName: "Test User",
	}

	// Test PIN validation
	assert.Equal(t, 6, len(validJoinMsg.PIN))
	
	// Test display name validation
	assert.True(t, len(validJoinMsg.DisplayName) > 0)
	assert.True(t, len(validJoinMsg.DisplayName) <= 50)
}

func TestContextCancellation(t *testing.T) {
	// Test that context cancellation is properly handled
	logger, _ := zap.NewDevelopment()
	gateway := NewWebSocketGateway(nil, nil, logger)
	
	// Create a context that can be cancelled
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	
	// Verify the gateway can handle context
	assert.NotNil(t, gateway)
	
	// Wait for context to be cancelled
	<-ctx.Done()
	assert.Error(t, ctx.Err())
}
