package agent

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"time"

	"github.com/shank318/coasterai/baml_client/types"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/utils"
)

type VideoAgent interface {
	Start(ctx context.Context, options StartSessionOptions) (*RunResult, error)
	Continue(ctx context.Context, options ContinueSessionOptions) (*RunResult, error)
	GetState(ctx context.Context) (*VideoAgentState, error)
	StateUpdates() <-chan VideoAgentState

	// StopAgent is the single stop entry-point used by HTTP handlers.
	// It writes stateStatusCancelled to Redis (so applyPlan exits) and marks
	// video status as USER_CANCELLED.
	StopAgent(ctx context.Context, videoID string) error
}

type StartSessionOptions struct {
	OrgID string
	Input *pbportal.CreateVideoRequest
}

type ContinueSessionOptions struct {
	UserResponse        string
	SelectedMediaAssets []*pbcore.SelectedMediaAsset
}

type RunStatus string

const (
	RunStatusCompleted           RunStatus = "COMPLETED"
	RunStatusWaitingForUserInput RunStatus = "WAITING_FOR_USER_INPUT"
	defaultFPS                             = 30
)

type RunResult struct {
	Status             RunStatus
	AskUserQuestion    *pbportal.AskUserQuestion
	GeneratedAnimation *models.Template
}

const (
	stateKeyPrefix        = "video_generation:state"
	sessionKeyPrefix      = "video_generation:session"
	stateStatusProcessing = "PROCESSING"
	stateStatusWaiting    = "WAITING_FOR_USER_INPUT"
	stateStatusReady      = "READY_FOR_EDITOR"
	stateStatusCancelled  = "USER_CANCELLED"
	stateStatusCompleted  = "COMPLETED"
	stateTTL              = 30 * time.Minute

	// thinking tests
	generating = "Generating..."
	matching   = "Matching..."
	extracting = "Extracting..."
)

const StateReadyForEditor = stateStatusReady

type VideoAgentState struct {
	VideoID          string                 `json:"video_id"`
	Thinking         string                 `json:"thinking"`
	State            string                 `json:"state"`
	AskUserQuestion  *types.AskUserQuestion `json:"ask_user_question,omitempty"`
	LastUserResponse string                 `json:"last_user_response,omitempty"`
}

type planningSession struct {
	Request             *pbportal.CreateVideoRequest `json:"request"`
	ConversationHistory []types.Message              `json:"conversation_history"`
}

func (p *planningSession) MarshalJSON() ([]byte, error) {

	var reqBytes []byte
	var err error

	if p.Request != nil {
		reqBytes, err = utils.MarshalProto(p.Request)
		if err != nil {
			return nil, err
		}
	}

	tmp := struct {
		Request             []byte          `json:"request,omitempty"`
		ConversationHistory []types.Message `json:"conversation_history"`
	}{
		Request:             reqBytes,
		ConversationHistory: p.ConversationHistory,
	}

	return json.Marshal(tmp)
}

func (p *planningSession) UnmarshalJSON(data []byte) error {

	tmp := struct {
		Request             []byte          `json:"request"`
		ConversationHistory []types.Message `json:"conversation_history"`
	}{}

	if err := json.Unmarshal(data, &tmp); err != nil {
		return err
	}

	p.ConversationHistory = tmp.ConversationHistory

	req := &pbportal.CreateVideoRequest{}

	if err := utils.UnmarshalProto(tmp.Request, req); err != nil {
		return err
	}
	p.Request = req

	return nil
}

// errUserSoftCancelled is returned by the applyPlan slide loop when a Redis-based
// soft-cancel is detected (written by StopAgent). It is distinct from ctx.Err() so
// the deferred error handler can tell the difference between a context cancel and a
// user-initiated stop that arrived through the Redis state channel.
var errUserSoftCancelled = errors.New("agent stopped via soft-cancel signal")
