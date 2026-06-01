package common

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/datastore"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

type SessionContext struct {
	Request             *pbportal.CreateVideoRequest  `json:"request"`
	ConversationHistory []*pbcore.ConversationMessage `json:"conversation_history"`
}

type AgentSession interface {
	GetID() string
	Get(ctx context.Context) (*SessionContext, error)
	ConvertToContextMessages(ctx context.Context, history []*pbcore.ConversationMessage) ([]types.Message, error)
	Save(ctx context.Context, session *SessionContext) error
}

type session struct {
	sessionKey string
	sessionID  string
	cache      cache.Cache
	db         datastore.Repository
	logger     *zap.Logger
}

func CreateNewSession(sessionID string, sessionKey string, cache cache.Cache, db datastore.Repository, logger *zap.Logger) AgentSession {
	return &session{
		sessionKey: sessionKey,
		sessionID:  sessionID,
		cache:      cache,
		db:         db,
		logger:     logger,
	}
}

func (a *session) GetID() string {
	return a.sessionID
}

func (a *session) Save(ctx context.Context, session *SessionContext) error {
	payload, err := json.Marshal(session)
	if err != nil {
		return agenterrors.SessionUnavailable("failed to encode planning session", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", a.sessionKey, a.sessionID), string(payload), stateTTL); err != nil {
		return agenterrors.SessionUnavailable("failed to persist planning session", err)
	}
	return nil
}

func (a *session) Get(ctx context.Context) (*SessionContext, error) {
	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s", a.sessionKey, a.sessionID))
	if err != nil {
		return nil, agenterrors.SessionUnavailable("failed to read planning session", err)
	}

	var sessionCtx SessionContext
	if err := json.Unmarshal([]byte(value), &sessionCtx); err != nil {
		return nil, agenterrors.SessionUnavailable("invalid planning session payload", err)
	}

	// keep only the last 5 messages
	if len(sessionCtx.ConversationHistory) > 5 {
		sessionCtx.ConversationHistory = sessionCtx.ConversationHistory[len(sessionCtx.ConversationHistory)-5:]
	}

	return &sessionCtx, nil
}

func (p *SessionContext) MarshalJSON() ([]byte, error) {
	var reqBytes []byte
	var err error

	if p.Request != nil {
		reqBytes, err = utils.MarshalProto(p.Request)
		if err != nil {
			return nil, err
		}
	}

	tmp := struct {
		Request             []byte                        `json:"request,omitempty"`
		ConversationHistory []*pbcore.ConversationMessage `json:"conversation_history"`
	}{
		Request:             reqBytes,
		ConversationHistory: p.ConversationHistory,
	}

	return json.Marshal(tmp)
}

func (p *SessionContext) UnmarshalJSON(data []byte) error {

	tmp := struct {
		Request             []byte                        `json:"request"`
		ConversationHistory []*pbcore.ConversationMessage `json:"conversation_history"`
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

func (a *session) ConvertToContextMessages(ctx context.Context, history []*pbcore.ConversationMessage) ([]types.Message, error) {
	messages := make([]types.Message, 0, len(history))

	for _, item := range history {
		message := types.Message{
			Content: item.Message,
		}
		if item.Role == pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT {
			message.Role = types.Union3KassistantOrKtoolOrKuser__NewKassistant()
		} else if item.Role == pbcore.ConversationRole_CONVERSATION_ROLE_USER {
			message.Role = types.Union3KassistantOrKtoolOrKuser__NewKuser()
		} else if item.Role == pbcore.ConversationRole_CONVERSATION_ROLE_TOOL {
			message.Role = types.Union3KassistantOrKtoolOrKuser__NewKtool()
		} else {
			return nil, agenterrors.InvalidInput("invalid conversation message role", nil)
		}

		if item.CodeSnapshot != "" {
			code, err := services.DownloadCode(ctx, item.CodeSnapshot)
			if err != nil {
				return nil, fmt.Errorf("failed to download code snapshot: %w", err)
			}

			message.Content = code
		}

		mediaAssets, err := a.db.GetMediaAssetsByID(ctx, item.AssetIds)
		if err != nil {
			return nil, fmt.Errorf("failed to get media assets: %w", err)
		}

		for _, mediaAsset := range mediaAssets {
			if mediaAsset.MediaType == pbcore.MediaType_MEDIA_TYPE_IMAGE {
				img, err := baml_client.NewImageFromUrl(mediaAsset.Path, utils.Ptr(pbcore.MediaType_MEDIA_TYPE_IMAGE.String()))
				if err != nil {
					return nil, fmt.Errorf("failed to convert image from url: %w", err)
				}
				message.Images = append(message.Images, img)
			}

			if mediaAsset.MediaType == pbcore.MediaType_MEDIA_TYPE_VIDEO {
				video, err := baml_client.NewVideoFromUrl(mediaAsset.Path, utils.Ptr(pbcore.MediaType_MEDIA_TYPE_VIDEO.String()))
				if err != nil {
					return nil, fmt.Errorf("failed to convert video from url: %w", err)
				}
				message.Videos = append(message.Videos, video)
			}
		}

		messages = append(messages, message)
	}

	return messages, nil
}
