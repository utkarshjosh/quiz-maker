package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
	"quiz-realtime-service/internal/models"
)

type RedisClient struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisClient() *RedisClient {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("Error parsing Redis URL: %v", err)
		opts = &redis.Options{
			Addr:     "localhost:6379",
			Password: "",
			DB:       0,
		}
	}

	client := redis.NewClient(opts)
	ctx := context.Background()

	// Test connection
	_, err = client.Ping(ctx).Result()
	if err != nil {
		log.Printf("❌ Failed to connect to Redis: %v", err)
	} else {
		log.Println("✅ Connected to Redis")
	}

	return &RedisClient{
		client: client,
		ctx:    ctx,
	}
}

func (r *RedisClient) Close() error {
	return r.client.Close()
}

// Quiz Room operations
func (r *RedisClient) SaveQuizRoom(room *models.QuizRoom) error {
	key := fmt.Sprintf("quiz:%s:room", room.ID)
	data, err := json.Marshal(room)
	if err != nil {
		return err
	}

	return r.client.Set(r.ctx, key, data, 24*time.Hour).Err()
}

func (r *RedisClient) GetQuizRoom(roomID string) (*models.QuizRoom, error) {
	key := fmt.Sprintf("quiz:%s:room", roomID)
	data, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var room models.QuizRoom
	err = json.Unmarshal([]byte(data), &room)
	if err != nil {
		return nil, err
	}

	return &room, nil
}

func (r *RedisClient) DeleteQuizRoom(roomID string) error {
	key := fmt.Sprintf("quiz:%s:room", roomID)
	return r.client.Del(r.ctx, key).Err()
}

// Quiz State operations
func (r *RedisClient) SaveQuizState(state *models.QuizState) error {
	key := fmt.Sprintf("quiz:%s:state", state.RoomID)
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}

	return r.client.Set(r.ctx, key, data, 24*time.Hour).Err()
}

func (r *RedisClient) GetQuizState(roomID string) (*models.QuizState, error) {
	key := fmt.Sprintf("quiz:%s:state", roomID)
	data, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var state models.QuizState
	err = json.Unmarshal([]byte(data), &state)
	if err != nil {
		return nil, err
	}

	return &state, nil
}

// Player operations
func (r *RedisClient) SavePlayerAnswer(roomID, playerID string, answer *models.Answer) error {
	key := fmt.Sprintf("player:%s:%s:answers", roomID, playerID)
	field := answer.QuestionID
	data, err := json.Marshal(answer)
	if err != nil {
		return err
	}

	return r.client.HSet(r.ctx, key, field, data).Err()
}

func (r *RedisClient) GetPlayerAnswers(roomID, playerID string) (map[string]models.Answer, error) {
	key := fmt.Sprintf("player:%s:%s:answers", roomID, playerID)
	data, err := r.client.HGetAll(r.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	answers := make(map[string]models.Answer)
	for questionID, answerData := range data {
		var answer models.Answer
		err = json.Unmarshal([]byte(answerData), &answer)
		if err != nil {
			continue
		}
		answers[questionID] = answer
	}

	return answers, nil
}

// Player scores operations
func (r *RedisClient) UpdatePlayerScore(roomID, playerID string, score int) error {
	key := fmt.Sprintf("quiz:%s:scores", roomID)
	return r.client.HSet(r.ctx, key, playerID, score).Err()
}

func (r *RedisClient) GetPlayerScores(roomID string) (map[string]int, error) {
	key := fmt.Sprintf("quiz:%s:scores", roomID)
	data, err := r.client.HGetAll(r.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	scores := make(map[string]int)
	for playerID, scoreStr := range data {
		var score int
		fmt.Sscanf(scoreStr, "%d", &score)
		scores[playerID] = score
	}

	return scores, nil
}

// Pub/Sub operations
func (r *RedisClient) PublishToRoom(roomID string, message *models.WebSocketMessage) error {
	channel := fmt.Sprintf("quiz_channel:%s", roomID)
	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return r.client.Publish(r.ctx, channel, data).Err()
}

func (r *RedisClient) SubscribeToRoom(roomID string) *redis.PubSub {
	channel := fmt.Sprintf("quiz_channel:%s", roomID)
	return r.client.Subscribe(r.ctx, channel)
}

// Quiz data operations
func (r *RedisClient) SaveQuiz(quiz *models.Quiz) error {
	key := fmt.Sprintf("quiz:%s:data", quiz.ID)
	data, err := json.Marshal(quiz)
	if err != nil {
		return err
	}

	return r.client.Set(r.ctx, key, data, 24*time.Hour).Err()
}

func (r *RedisClient) GetQuiz(quizID string) (*models.Quiz, error) {
	key := fmt.Sprintf("quiz:%s:data", quizID)
	data, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var quiz models.Quiz
	err = json.Unmarshal([]byte(data), &quiz)
	if err != nil {
		return nil, err
	}

	return &quiz, nil
}

// Utility functions
func (r *RedisClient) SetExpiration(key string, expiration time.Duration) error {
	return r.client.Expire(r.ctx, key, expiration).Err()
}

func (r *RedisClient) KeyExists(key string) (bool, error) {
	count, err := r.client.Exists(r.ctx, key).Result()
	return count > 0, err
} 