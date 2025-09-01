package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type RedisStore struct {
	client *redis.Client
	logger *zap.Logger
}

func NewRedisStore(addr, password string, db int, logger *zap.Logger) *RedisStore {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	return &RedisStore{
		client: rdb,
		logger: logger,
	}
}

func (r *RedisStore) Close() error {
	return r.client.Close()
}

// Ping checks Redis connectivity
func (r *RedisStore) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Room PIN management
func (r *RedisStore) ReservePIN(ctx context.Context, pin, roomID string, ttl time.Duration) error {
	key := fmt.Sprintf("pin:%s", pin)
	success, err := r.client.SetNX(ctx, key, roomID, ttl).Result()
	if err != nil {
		return fmt.Errorf("failed to reserve PIN: %w", err)
	}
	if !success {
		return fmt.Errorf("PIN already exists")
	}
	return nil
}

func (r *RedisStore) GetRoomByPIN(ctx context.Context, pin string) (string, error) {
	key := fmt.Sprintf("pin:%s", pin)
	roomID, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("PIN not found")
	}
	if err != nil {
		return "", fmt.Errorf("failed to get room by PIN: %w", err)
	}
	return roomID, nil
}

func (r *RedisStore) ReleasePIN(ctx context.Context, pin string) error {
	key := fmt.Sprintf("pin:%s", pin)
	return r.client.Del(ctx, key).Err()
}

// Room state management
func (r *RedisStore) SetRoomState(ctx context.Context, roomID string, state interface{}, ttl time.Duration) error {
	key := fmt.Sprintf("room:%s:state", roomID)
	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal room state: %w", err)
	}
	return r.client.Set(ctx, key, data, ttl).Err()
}

func (r *RedisStore) GetRoomState(ctx context.Context, roomID string, state interface{}) error {
	key := fmt.Sprintf("room:%s:state", roomID)
	data, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return fmt.Errorf("room state not found")
	}
	if err != nil {
		return fmt.Errorf("failed to get room state: %w", err)
	}
	return json.Unmarshal([]byte(data), state)
}

func (r *RedisStore) DeleteRoomState(ctx context.Context, roomID string) error {
	key := fmt.Sprintf("room:%s:state", roomID)
	return r.client.Del(ctx, key).Err()
}

// Room presence management
func (r *RedisStore) AddUserToRoom(ctx context.Context, roomID, userID string, ttl time.Duration) error {
	key := fmt.Sprintf("room:%s:presence", roomID)
	return r.client.SAdd(ctx, key, userID).Err()
}

func (r *RedisStore) RemoveUserFromRoom(ctx context.Context, roomID, userID string) error {
	key := fmt.Sprintf("room:%s:presence", roomID)
	return r.client.SRem(ctx, key, userID).Err()
}

func (r *RedisStore) GetRoomUsers(ctx context.Context, roomID string) ([]string, error) {
	key := fmt.Sprintf("room:%s:presence", roomID)
	return r.client.SMembers(ctx, key).Result()
}

func (r *RedisStore) IsUserInRoom(ctx context.Context, roomID, userID string) (bool, error) {
	key := fmt.Sprintf("room:%s:presence", roomID)
	return r.client.SIsMember(ctx, key, userID).Result()
}

// Answer storage
func (r *RedisStore) SetUserAnswer(ctx context.Context, roomID string, questionIndex int, userID, answer string, answerTime int64) error {
	key := fmt.Sprintf("room:%s:answers:%d", roomID, questionIndex)
	answerData := map[string]interface{}{
		"answer":      answer,
		"answer_time": answerTime,
		"timestamp":   time.Now().UnixMilli(),
	}
	data, err := json.Marshal(answerData)
	if err != nil {
		return fmt.Errorf("failed to marshal answer: %w", err)
	}
	return r.client.HSet(ctx, key, userID, data).Err()
}

func (r *RedisStore) GetUserAnswer(ctx context.Context, roomID string, questionIndex int, userID string) (string, int64, error) {
	key := fmt.Sprintf("room:%s:answers:%d", roomID, questionIndex)
	data, err := r.client.HGet(ctx, key, userID).Result()
	if err == redis.Nil {
		return "", 0, fmt.Errorf("answer not found")
	}
	if err != nil {
		return "", 0, fmt.Errorf("failed to get answer: %w", err)
	}

	var answerData struct {
		Answer     string `json:"answer"`
		AnswerTime int64  `json:"answer_time"`
	}
	if err := json.Unmarshal([]byte(data), &answerData); err != nil {
		return "", 0, fmt.Errorf("failed to unmarshal answer: %w", err)
	}

	return answerData.Answer, answerData.AnswerTime, nil
}

func (r *RedisStore) GetAllAnswers(ctx context.Context, roomID string, questionIndex int) (map[string]string, error) {
	key := fmt.Sprintf("room:%s:answers:%d", roomID, questionIndex)
	return r.client.HGetAll(ctx, key).Result()
}

// Rate limiting
func (r *RedisStore) CheckRateLimit(ctx context.Context, key string, limit int, window time.Duration) (bool, error) {
	now := time.Now()
	pipe := r.client.Pipeline()
	
	// Remove expired entries
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", now.Add(-window).UnixMilli()))
	
	// Count current entries
	countCmd := pipe.ZCard(ctx, key)
	
	// Add current request
	pipe.ZAdd(ctx, key, redis.Z{Score: float64(now.UnixMilli()), Member: now.UnixNano()})
	
	// Set expiration
	pipe.Expire(ctx, key, window)
	
	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, fmt.Errorf("rate limit check failed: %w", err)
	}
	
	count := countCmd.Val()
	return count < int64(limit), nil
}

// Pub/Sub for room events
func (r *RedisStore) PublishRoomEvent(ctx context.Context, roomID string, message interface{}) error {
	channel := fmt.Sprintf("ws:room:%s", roomID)
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}
	return r.client.Publish(ctx, channel, data).Err()
}

func (r *RedisStore) SubscribeToRoom(ctx context.Context, roomID string) *redis.PubSub {
	channel := fmt.Sprintf("ws:room:%s", roomID)
	return r.client.Subscribe(ctx, channel)
}

// Room cleanup
func (r *RedisStore) CleanupRoom(ctx context.Context, roomID string) error {
	pattern := fmt.Sprintf("room:%s:*", roomID)
	keys, err := r.client.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get room keys: %w", err)
	}
	
	if len(keys) > 0 {
		return r.client.Del(ctx, keys...).Err()
	}
	
	return nil
}
