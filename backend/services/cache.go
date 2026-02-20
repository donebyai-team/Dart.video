package services

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/go-redis/redis"
)

const cachePrefix = "coasterai:"

var ErrCacheMiss = errors.New("cache key not found")

type Cache interface {
	SetKey(ctx context.Context, key, value string, ttl time.Duration) error
	GetKey(ctx context.Context, key string) (string, error)
}

type redisCache struct {
	redisClient *redis.Client
}

func NewRedisCache(redisAddr string) (Cache, error) {
	client, err := newRedisClient(redisAddr)
	if err != nil {
		return nil, err
	}

	if _, err := client.Ping().Result(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}

	return &redisCache{redisClient: client}, nil
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

func newRedisClient(redisAddr string) (*redis.Client, error) {
	if strings.HasPrefix(redisAddr, "redis://") || strings.HasPrefix(redisAddr, "rediss://") {
		parsedURL, err := url.Parse(redisAddr)
		if err != nil {
			return nil, fmt.Errorf("parse redis url: %w", err)
		}

		password, _ := parsedURL.User.Password()
		host := parsedURL.Hostname()
		port := parsedURL.Port()
		if host == "" || port == "" {
			return nil, fmt.Errorf("redis url must include host and port")
		}

		return redis.NewClient(&redis.Options{
			Addr:     fmt.Sprintf("%s:%s", host, port),
			Password: password,
		}), nil
	}

	if strings.TrimSpace(redisAddr) == "" {
		return nil, fmt.Errorf("redis address is required")
	}

	return redis.NewClient(&redis.Options{Addr: redisAddr}), nil
}
