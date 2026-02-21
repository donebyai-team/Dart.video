package cache

import (
	"context"
	"errors"
	"fmt"
	"go.uber.org/zap"
	"log"
	"net/url"
	"time"

	"github.com/go-redis/redis"
)

const cachePrefix = "coasterai:"

var ErrCacheMiss = errors.New("cache key not found")

type Cache interface {
	SetKey(ctx context.Context, key, value string, ttl time.Duration) error
	GetKey(ctx context.Context, key string) (string, error)
	AuthStateStore
}

type redisCache struct {
	redisClient *redis.Client
	logger      *zap.Logger
}

func NewRedisStore(redisAddr string, logger *zap.Logger) Cache {
	var redisClient *redis.Client
	// Check if redisAddr starts with the redis:// scheme
	if len(redisAddr) > 6 && redisAddr[:6] == "redis:" {
		// Parse the Redis URL
		parsedURL, err := url.Parse(redisAddr)
		if err != nil {
			log.Fatalf("Error parsing Redis URL: %v", err)
		}

		// Extracting user and password from the URL
		password, _ := parsedURL.User.Password()

		// Extracting the host and port
		host := parsedURL.Hostname()
		port := parsedURL.Port()

		// Set up Redis client options
		options := &redis.Options{
			Addr:     fmt.Sprintf("%s:%s", host, port),
			Password: password, // Password from the URL
		}
		redisClient = redis.NewClient(options)
	} else {
		// Use the simple address like localhost:6379
		redisClient = redis.NewClient(&redis.Options{
			Addr: redisAddr,
		})
	}

	_, err := redisClient.Ping().Result()
	if err != nil {
		logger.Error("Error connecting to Redis", zap.Error(err))
	}
	return &redisCache{
		redisClient: redisClient,
		logger:      logger,
	}
}

func (r *redisCache) SetKey(ctx context.Context, key, value string, ttl time.Duration) error {
	if key == "" {
		return fmt.Errorf("key is required")
	}
	if ttl <= 0 {
		return fmt.Errorf("ttl must be > 0")
	}

	if cmd := r.redisClient.Set(prefixedKey(key), value, ttl); cmd.Err() != nil {
		return fmt.Errorf("set cache key: %w", cmd.Err())
	}
	return nil
}

func (r *redisCache) GetKey(ctx context.Context, key string) (string, error) {
	if key == "" {
		return "", fmt.Errorf("key is required")
	}

	value, err := r.redisClient.Get(prefixedKey(key)).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return "", ErrCacheMiss
		}
		return "", fmt.Errorf("get cache key: %w", err)
	}
	return value, nil
}

func prefixedKey(key string) string {
	return cachePrefix + key
}
