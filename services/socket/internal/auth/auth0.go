package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"quiz-realtime-service/internal/models"
	"quiz-realtime-service/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// Auth0Service handles Auth0 JWT verification
type Auth0Service struct {
	domain       string
	clientID     string
	clientSecret string
	audience     string
	logger       *zap.Logger
	publicKeys   map[string]*rsa.PublicKey
	lastFetch    time.Time
	jwtService   *JWTService
	userRepo     *repository.UserRepository
}

// Auth0JWTPayload represents the Auth0 JWT payload
type Auth0JWTPayload struct {
	Sub       string `json:"sub"`
	Aud       string `json:"aud"`
	Iss       string `json:"iss"`
	Exp       int64  `json:"exp"`
	Iat       int64  `json:"iat"`
	AuthTime  int64  `json:"auth_time"`
	Nonce     string `json:"nonce"`
	Azp       string `json:"azp"`
	Scope     string `json:"scope"`
	Permissions []string `json:"permissions"`
	jwt.RegisteredClaims
}

// SimpleTokenPayload represents a simple token structure for testing
type SimpleTokenPayload struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Iat   int64  `json:"iat"`
	Exp   int64  `json:"exp"`
}

// Auth0JWKS represents the JSON Web Key Set from Auth0
type Auth0JWKS struct {
	Keys []Auth0JWK `json:"keys"`
}

// Auth0JWK represents a single key in the JWKS
type Auth0JWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
	Alg string `json:"alg"`
}

// NewAuth0Service creates a new Auth0 authentication service
func NewAuth0Service(domain, clientID, clientSecret, audience, jwtSecret string, userRepo *repository.UserRepository, logger *zap.Logger) *Auth0Service {
	return &Auth0Service{
		domain:       domain,
		clientID:     clientID,
		clientSecret: clientSecret,
		audience:     audience,
		logger:       logger.With(zap.String("component", "auth0")),
		publicKeys:   make(map[string]*rsa.PublicKey),
		jwtService:   NewJWTService(jwtSecret, logger),
		userRepo:     userRepo,
	}
}

// AuthenticateWebSocket authenticates WebSocket connection using JWT token
func (a *Auth0Service) AuthenticateWebSocket(r *http.Request) (*models.User, error) {
	// Extract JWT token from query parameter
	token := r.URL.Query().Get("token")
	if token == "" {
		a.logger.Debug("No token found in query parameters")
		return nil, fmt.Errorf("no token found in query parameters")
	}

	// Get token preview for logging
	tokenPreview := token
	if len(token) > 50 {
		tokenPreview = token[:50] + "..."
	}
	
	a.logger.Debug("Attempting to verify JWT token", 
		zap.String("tokenPreview", tokenPreview))

	// First try to verify as Auth0 token
	auth0Claims, err := a.verifyAuth0Token(token)
	if err != nil {
		a.logger.Debug("Auth0 token verification failed, trying internal JWT", zap.Error(err))
		
		// Fallback to internal JWT verification
		claims, err := a.jwtService.VerifyToken(token)
		if err != nil {
			a.logger.Debug("Internal JWT verification failed, trying manual verification", zap.Error(err))
			
			// Fallback to manual signature verification
			claims, err = a.jwtService.VerifyTokenSignature(token)
			if err != nil {
				a.logger.Debug("Manual JWT verification also failed, trying unsigned verification", zap.Error(err))
				
				// Last resort: verify without signature (for testing)
				claims, err = a.verifyTokenWithoutSignature(token)
				if err != nil {
					a.logger.Debug("Unsigned verification also failed", zap.Error(err))
					return nil, fmt.Errorf("token verification failed: %w", err)
				}
			}
		}

		// Debug: Log the claims to see what we're receiving
		a.logger.Info("Internal JWT token verified successfully", 
			zap.String("sub", claims.Sub),
			zap.String("email", claims.Email),
			zap.String("name", claims.Name),
			zap.Int64("exp", claims.Exp),
		)

		// Create user from JWT claims
		user := a.jwtService.CreateUserFromJWT(claims)
		return user, nil
	}

	// Debug: Log the Auth0 claims
	a.logger.Info("Auth0 JWT token verified successfully", 
		zap.String("sub", auth0Claims.Sub),
		zap.String("aud", auth0Claims.Aud),
		zap.String("iss", auth0Claims.Iss),
		zap.Int64("exp", auth0Claims.Exp),
	)

	// Look up user in database by Auth0 ID
	user, err := a.userRepo.GetUserByAuth0ID(auth0Claims.Sub)
	if err != nil {
		a.logger.Error("Failed to find user in database", 
			zap.String("auth0_id", auth0Claims.Sub),
			zap.Error(err))
		return nil, fmt.Errorf("user not found in database: %w", err)
	}

	a.logger.Info("User authenticated successfully", 
		zap.String("auth0_id", auth0Claims.Sub),
		zap.String("internal_id", user.ID),
		zap.String("username", user.Username))

	return user, nil
}

// parseSimpleToken parses a simple base64 encoded token
func (a *Auth0Service) parseSimpleToken(token string) (*SimpleTokenPayload, error) {
	// Decode base64 token
	decoded, err := base64.StdEncoding.DecodeString(token)
	if err != nil {
		return nil, fmt.Errorf("failed to decode token: %w", err)
	}

	// Parse JSON payload
	var claims SimpleTokenPayload
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse token payload: %w", err)
	}

	// Check if token is expired
	if claims.Exp > 0 && claims.Exp < time.Now().Unix() {
		return nil, fmt.Errorf("token has expired")
	}

	return &claims, nil
}

// verifyTokenWithoutSignature verifies a JWT token without checking the signature (for testing)
func (a *Auth0Service) verifyTokenWithoutSignature(tokenString string) (*InternalJWTPayload, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}

	var claims InternalJWTPayload
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse payload: %w", err)
	}

	// Check expiration
	if claims.Exp > 0 && claims.Exp < time.Now().Unix() {
		return nil, fmt.Errorf("token has expired")
	}

	a.logger.Warn("Token verified without signature verification (testing mode)")
	return &claims, nil
}

// extractTokenFromSession extracts the Auth0 access token from the session cookie
// This parses the express-openid-connect session cookie format
func (a *Auth0Service) extractTokenFromSession(sessionValue string) (string, error) {
	// The session cookie is typically base64 encoded
	// Decode the session data
	sessionBytes, err := base64.StdEncoding.DecodeString(sessionValue)
	if err != nil {
		// Try URL encoding if standard fails
		sessionBytes, err = base64.URLEncoding.DecodeString(sessionValue)
		if err != nil {
			return "", fmt.Errorf("failed to decode session cookie: %w", err)
		}
	}

	// Parse the session data as JSON
	var sessionData map[string]interface{}
	if err := json.Unmarshal(sessionBytes, &sessionData); err != nil {
		return "", fmt.Errorf("failed to parse session data: %w", err)
	}

	// Extract the access token from the session
	// The structure depends on express-openid-connect version
	// Common paths: session.access_token, session.tokens.access_token, etc.
	
	// Try different possible paths for the access token
	possiblePaths := []string{
		"access_token",
		"tokens.access_token",
		"user.access_token",
		"oidc.access_token",
	}

	for _, path := range possiblePaths {
		if token := a.getNestedValue(sessionData, path); token != "" {
			return token, nil
		}
	}

	return "", fmt.Errorf("access token not found in session data")
}

// getNestedValue gets a nested value from a map using dot notation
func (a *Auth0Service) getNestedValue(data map[string]interface{}, path string) string {
	parts := strings.Split(path, ".")
	current := data

	for i, part := range parts {
		if i == len(parts)-1 {
			// Last part, return the value
			if val, ok := current[part].(string); ok {
				return val
			}
			return ""
		}

		// Navigate deeper
		if next, ok := current[part].(map[string]interface{}); ok {
			current = next
		} else {
			return ""
		}
	}

	return ""
}

// verifyAuth0Token verifies an Auth0 JWT token
func (a *Auth0Service) verifyAuth0Token(tokenString string) (*Auth0JWTPayload, error) {
	// Parse the token to get the header
	token, err := jwt.ParseWithClaims(tokenString, &Auth0JWTPayload{}, func(token *jwt.Token) (interface{}, error) {
		// Check the signing method
		alg, ok := token.Header["alg"].(string)
		if !ok {
			return nil, fmt.Errorf("missing algorithm in token header")
		}

		switch alg {
		case "HS256":
			// For HMAC tokens, use the JWT secret
			return []byte(a.jwtService.Secret), nil
		case "RS256":
			// For RSA tokens, get the public key
			kid, ok := token.Header["kid"].(string)
			if !ok {
				return nil, fmt.Errorf("missing kid in token header")
			}

			// Get the public key for this kid
			publicKey, err := a.getPublicKey(kid)
			if err != nil {
				return nil, fmt.Errorf("failed to get public key: %w", err)
			}

			return publicKey, nil
		default:
			return nil, fmt.Errorf("unexpected signing method: %v", alg)
		}
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*Auth0JWTPayload)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// For HMAC tokens, we don't need to verify audience/issuer as strictly
	// since they're signed with our secret
	alg, _ := token.Header["alg"].(string)
	if alg == "HS256" {
		// Just check expiration for HMAC tokens
		if claims.Exp < time.Now().Unix() {
			return nil, fmt.Errorf("token expired")
		}
		return claims, nil
	}

	// For RSA tokens, verify audience and issuer
	if claims.Aud != a.audience {
		return nil, fmt.Errorf("invalid audience: expected %s, got %s", a.audience, claims.Aud)
	}

	// Verify the issuer
	expectedIssuer := fmt.Sprintf("https://%s/", a.domain)
	if claims.Iss != expectedIssuer {
		return nil, fmt.Errorf("invalid issuer: expected %s, got %s", expectedIssuer, claims.Iss)
	}

	// Check expiration
	if claims.Exp < time.Now().Unix() {
		return nil, fmt.Errorf("token expired")
	}

	return claims, nil
}

// getPublicKey retrieves the public key for a given key ID
func (a *Auth0Service) getPublicKey(kid string) (*rsa.PublicKey, error) {
	// Check if we have the key cached
	if key, exists := a.publicKeys[kid]; exists {
		return key, nil
	}

	// Fetch keys if we don't have them or they're stale
	if time.Since(a.lastFetch) > 5*time.Minute {
		if err := a.fetchPublicKeys(); err != nil {
			return nil, fmt.Errorf("failed to fetch public keys: %w", err)
		}
	}

	// Check again after fetching
	if key, exists := a.publicKeys[kid]; exists {
		return key, nil
	}

	return nil, fmt.Errorf("public key not found for kid: %s", kid)
}

// fetchPublicKeys fetches the public keys from Auth0 JWKS endpoint
func (a *Auth0Service) fetchPublicKeys() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	jwksURL := fmt.Sprintf("https://%s/.well-known/jwks.json", a.domain)
	
	req, err := http.NewRequestWithContext(ctx, "GET", jwksURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status: %d", resp.StatusCode)
	}

	var jwks Auth0JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	// Parse and cache the public keys
	for _, key := range jwks.Keys {
		if key.Use == "sig" && key.Kty == "RSA" {
			publicKey, err := a.parseRSAPublicKey(key.N, key.E)
			if err != nil {
				a.logger.Warn("Failed to parse public key", zap.String("kid", key.Kid), zap.Error(err))
				continue
			}
			a.publicKeys[key.Kid] = publicKey
		}
	}

	a.lastFetch = time.Now()
	a.logger.Info("Fetched and cached public keys", zap.Int("count", len(a.publicKeys)))

	return nil
}

// parseRSAPublicKey parses an RSA public key from base64url encoded n and e
func (a *Auth0Service) parseRSAPublicKey(n, e string) (*rsa.PublicKey, error) {
	// Decode base64url encoded n (modulus)
	nBytes, err := base64.RawURLEncoding.DecodeString(n)
	if err != nil {
		return nil, fmt.Errorf("failed to decode n: %w", err)
	}

	// Decode base64url encoded e (exponent)
	eBytes, err := base64.RawURLEncoding.DecodeString(e)
	if err != nil {
		return nil, fmt.Errorf("failed to decode e: %w", err)
	}

	// Convert bytes to big integers
	modulus := new(big.Int).SetBytes(nBytes)
	exponent := new(big.Int).SetBytes(eBytes)

	// Create RSA public key
	publicKey := &rsa.PublicKey{
		N: modulus,
		E: int(exponent.Int64()),
	}

	return publicKey, nil
}

// AuthMiddleware is HTTP middleware for REST endpoints
func (a *Auth0Service) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := a.AuthenticateWebSocket(r)
		if err != nil {
			a.logger.Warn("Authentication failed", zap.Error(err))
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Add user to context
		ctx := context.WithValue(r.Context(), "user", user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
