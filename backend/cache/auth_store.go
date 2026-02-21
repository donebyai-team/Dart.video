package cache

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-redis/redis"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"strings"
	"time"
)

//go:generate go-enum -f=$GOFILE

// ENUM(integration, message_source)
type AuthStateContext string

type AuthStateStore interface {
	GetState(hash string) (*State, error)
	DelState(hash string) error
	SetState(s *State) error
}

type State struct {
	Hash            string                   `json:"hash"`
	Nonce           string                   `json:"nonce"`
	Context         AuthStateContext         `json:"context"`
	ContextId       *string                  `json:"context_id,omitempty"` // message_source_id
	IntegrationType pbportal.IntegrationType `json:"integrationType,omitempty"`
	RedirectUri     string                   `json:"redirect_uri"`
	ExpiresAt       time.Time                `json:"expires_at"`
}

func (s *State) HasExpired() bool {
	return s.ExpiresAt.Before(time.Now())
}

func orgNameFromEmail(email string) string {
	return strings.Split(email, "@")[0]
}

var NotFound = errors.New("state not found")

// DelState implements AuthStateStore.
func (r *redisCache) DelState(hash string) error {
	key := stateKey(hash)
	if cmd := r.redisClient.Del(key); cmd.Err() != nil {
		return fmt.Errorf("del auth state: %w", cmd.Err())
	}
	return nil
}

// GetState implements AuthStateStore.
func (r *redisCache) GetState(hash string) (*State, error) {
	key := stateKey(hash)
	value, err := r.redisClient.Get(key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, NotFound
		}
		return nil, fmt.Errorf("get auth state: %w", err)
	}

	s := &State{}
	if err := json.Unmarshal(value, s); err != nil {
		return nil, fmt.Errorf("unmarhsal state: %w", err)
	}
	return s, nil
}

// SetState implements AuthStateStore.
func (r *redisCache) SetState(s *State) error {
	key := stateKey(s.Hash)
	value, err := json.Marshal(s)
	if err != nil {
		return fmt.Errorf("marshal state: %w", err)
	}

	if cmd := r.redisClient.Set(key, value, 5*time.Minute); cmd.Err() != nil {
		return fmt.Errorf("set auth  state: %w", cmd.Err())
	}
	return nil
}

const namespace = "auth"
const statePrefix = "state"

func stateKey(hash string) string {
	return strings.Join([]string{namespace, statePrefix, hash}, ":")
}
