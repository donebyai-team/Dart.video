package common

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/cache"
	"go.uber.org/zap"
	"time"
)

const (
	StateStatusWaiting    = "WAITING_FOR_USER_INPUT"
	StateStatusProcessing = "PROCESSING"
	StateStatusReady      = "READY_FOR_EDITOR"
	StateStatusCancelled  = "USER_CANCELLED"
	StateStatusCompleted  = "COMPLETED"
)

type AgentState struct {
	ID       string `json:"id"`
	Thinking string `json:"thinking"`
	State    string `json:"state"`
}

type AgentStatusPublisher interface {
	Get(ctx context.Context) (*AgentState, error)
	Save(ctx context.Context, state AgentState) error
	StateUpdates() <-chan AgentState
	Publish(state AgentState)
}

type agentStatus struct {
	sessionID    string
	cache        cache.Cache
	logger       *zap.Logger
	stateUpdates chan AgentState
}

func CreateAgentStatusPublisher(
	sessionID string,
	logger *zap.Logger) AgentStatusPublisher {
	return CreatePersistedAgentStatusPublisher(sessionID, nil, logger)
}

func CreatePersistedAgentStatusPublisher(
	sessionID string,
	cache cache.Cache,
	logger *zap.Logger) AgentStatusPublisher {
	return &agentStatus{
		sessionID:    sessionID,
		cache:        cache,
		logger:       logger,
		stateUpdates: make(chan AgentState, 64)}
}

const stateKeyPrefix = "video_generation:state"
const stateTTL = 30 * time.Minute

func (a agentStatus) Get(ctx context.Context) (*AgentState, error) {
	if a.cache == nil {
		return nil, fmt.Errorf("cache is not set")
	}

	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s", stateKeyPrefix, a.sessionID))
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			return nil, nil
		}
		return nil, agenterrors.StateUnavailable("failed to read agent state", err)
	}

	var state AgentState
	if err := json.Unmarshal([]byte(value), &state); err != nil {
		return nil, agenterrors.StateUnavailable("invalid agent state payload", err)
	}
	return &state, nil
}

func (a agentStatus) Save(ctx context.Context, state AgentState) error {
	select {
	case a.stateUpdates <- state:
	default:
	}

	if a.cache == nil {
		return nil
	}

	// store
	jsonBytes, err := json.Marshal(state)
	if err != nil {
		errUpdated := agenterrors.StateUnavailable("failed to encode state payload", err)
		a.logger.Error("failed to update state", zap.Error(errUpdated))
		return errUpdated
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", stateKeyPrefix, state.ID), string(jsonBytes), stateTTL); err != nil {
		errUpdated := agenterrors.StateUnavailable("failed to persist agent state", err)
		a.logger.Error("failed to update state", zap.Error(errUpdated))
		return errUpdated
	}

	return nil
}

func (a agentStatus) Publish(state AgentState) {
	select {
	case a.stateUpdates <- state:
	default:
	}
}

func (a agentStatus) StateUpdates() <-chan AgentState {
	return a.stateUpdates
}
