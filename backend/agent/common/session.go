package common

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/datastore"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/code_builder"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"
	"sort"
	"time"
)

const MaxConversationMessages = 10

type SessionContext struct {
	Request             *pbportal.CreateVideoRequest  `json:"request"`
	TemplateIds         []string                      `json:"template_ids"`
	ConversationHistory []*pbcore.ConversationMessage `json:"conversation_history"`
}

type AgentSession interface {
	GetID() string
	Get(ctx context.Context) (*SessionContext, error)
	ConvertToContextMessages(ctx context.Context, history []*pbcore.ConversationMessage, registry *services.MediaAssetRegistry) ([]types.Message, pbcore.AIModel, error)
	Save(ctx context.Context, session *SessionContext) error
}

const sessionTTL = 30 * 24 * time.Hour

type session struct {
	sessionKey string
	sessionID  string
	cache      cache.Cache
	db         datastore.Repository
	logger     *zap.Logger
}

func NewAgentSession(sessionID string, sessionKey string, cache cache.Cache, db datastore.Repository, logger *zap.Logger) AgentSession {
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
	for _, message := range session.ConversationHistory {
		if message.CreatedAt == nil {
			message.CreatedAt = timestamppb.Now()
		}
	}

	payload, err := json.Marshal(session)
	if err != nil {
		return agenterrors.SessionUnavailable("failed to encode planning session", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", a.sessionKey, a.sessionID), string(payload), sessionTTL); err != nil {
		return agenterrors.SessionUnavailable("failed to persist planning session", err)
	}
	return nil
}

func (a *session) Get(ctx context.Context) (*SessionContext, error) {
	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s", a.sessionKey, a.sessionID))
	if err != nil && !errors.Is(err, cache.ErrCacheMiss) {
		return nil, agenterrors.SessionUnavailable("failed to read session", err)
	}

	if err != nil && errors.Is(err, cache.ErrCacheMiss) {
		return nil, nil
	}

	var sessionCtx SessionContext
	if err := json.Unmarshal([]byte(value), &sessionCtx); err != nil {
		return nil, agenterrors.SessionUnavailable("invalid planning session payload", err)
	}

	return &sessionCtx, nil
}

func (p *SessionContext) FilterAndGetConversation(isPlatformAdmin bool, includeAll bool, checkpoint string) ([]*pbcore.ConversationMessage, error) {
	history := make([]*pbcore.ConversationMessage, len(p.ConversationHistory))
	copy(history, p.ConversationHistory)

	sort.Slice(history, func(i, j int) bool {
		leftCreatedAt := history[i].GetCreatedAt()
		rightCreatedAt := history[j].GetCreatedAt()

		if leftCreatedAt == nil && rightCreatedAt == nil {
			return history[i].GetId() < history[j].GetId()
		}

		if leftCreatedAt == nil {
			return true
		}

		if rightCreatedAt == nil {
			return false
		}

		leftTime := leftCreatedAt.AsTime()
		rightTime := rightCreatedAt.AsTime()
		if leftTime.Equal(rightTime) {
			return history[i].GetId() < history[j].GetId()
		}

		return leftTime.Before(rightTime)
	})

	if checkpoint != "" {
		for i, message := range history {
			if message.GetId() == checkpoint {
				if message.Type != pbcore.ConversationMessageType_CONVERSATION_MESSAGE_TYPE_CHECKPOINT ||
					message.CodeSnapshot == "" {
					return nil, fmt.Errorf("invalid checkpoint")
				}
				history = history[:i+1]
				break
			}
		}
	}

	conversation := make([]*pbcore.ConversationMessage, 0, len(history))

	// Include USER/TOOL messages that are not MANUAL_EDITS, and if the message is THINKING then only include it for admins.
	for _, message := range history {
		isUserOrTool :=
			message.Role == pbcore.ConversationRole_CONVERSATION_ROLE_USER ||
				message.Role == pbcore.ConversationRole_CONVERSATION_ROLE_TOOL

		if message.Type == pbcore.ConversationMessageType_CONVERSATION_MESSAGE_TYPE_CHECKPOINT &&
			message.Role == pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT {
			isUserOrTool = true
		}

		//if message.CodeSnapshot != "" &&
		//	message.Role == pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT {
		//	message.Type = pbcore.ConversationMessageType_CONVERSATION_MESSAGE_TYPE_CHECKPOINT
		//	message.Id = "aaa"
		//	isUserOrTool = true
		//}

		isAdminThinking :=
			isPlatformAdmin &&
				message.Role == pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT &&
				(message.Type == pbcore.ConversationMessageType_CONVERSATION_MESSAGE_THINKING ||
					message.Type == pbcore.ConversationMessageType_CONVERSATION_MESSAGE_FINAL_THINKING)

		if ((isUserOrTool &&
			message.Type != pbcore.ConversationMessageType_CONVERSATION_MESSAGE_MANUAL_EDITS) ||
			isAdminThinking) || (includeAll && isPlatformAdmin) {
			conversation = append(conversation, message)
		}
	}

	return conversation, nil
}

func (p *SessionContext) AddMessage(message *pbcore.ConversationMessage) {
	message.CreatedAt = timestamppb.Now()
	message.Id = uuid.New().String()
	p.ConversationHistory = append(p.ConversationHistory, message)
}

func (p *SessionContext) AddCodeCheckpoint(codeRegistry *pbcore.CodeRegistry, frames int32) {
	message := &pbcore.ConversationMessage{
		Role:             pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
		CodeSnapshot:     codeRegistry.MUrl,
		DefaultCodeData:  codeRegistry.Defaults,
		DurationInFrames: utils.Ptr(frames),
		Type:             pbcore.ConversationMessageType_CONVERSATION_MESSAGE_TYPE_CHECKPOINT,
	}
	message.CreatedAt = timestamppb.Now()
	message.Id = uuid.New().String()
	p.ConversationHistory = append(p.ConversationHistory, message)
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
		TemplateIds         []string                      `json:"template_ids,omitempty"`
	}{
		Request:             reqBytes,
		ConversationHistory: p.ConversationHistory,
		TemplateIds:         p.TemplateIds,
	}

	return json.Marshal(tmp)
}

func (p *SessionContext) UnmarshalJSON(data []byte) error {

	tmp := struct {
		Request             []byte                        `json:"request"`
		ConversationHistory []*pbcore.ConversationMessage `json:"conversation_history"`
		TemplateIds         []string                      `json:"template_ids,omitempty"`
	}{}

	if err := json.Unmarshal(data, &tmp); err != nil {
		return err
	}

	p.ConversationHistory = tmp.ConversationHistory
	p.TemplateIds = tmp.TemplateIds

	req := &pbportal.CreateVideoRequest{}

	if err := utils.UnmarshalProto(tmp.Request, req); err != nil {
		return err
	}
	p.Request = req

	return nil
}

func (a *session) ConvertToContextMessages(ctx context.Context, history []*pbcore.ConversationMessage, registry *services.MediaAssetRegistry) ([]types.Message, pbcore.AIModel, error) {
	// Sort ASC and Limit
	sort.Slice(history, func(i, j int) bool {
		return history[i].CreatedAt.AsTime().Before(history[j].CreatedAt.AsTime())
	})

	if len(history) > MaxConversationMessages {
		history = history[len(history)-MaxConversationMessages:]
	}

	var codeSnapshotIndexes []int
	for i, item := range history {
		if item.CodeSnapshot != "" {
			codeSnapshotIndexes = append(codeSnapshotIndexes, i)
		}
	}

	keepCode := make(map[int]struct{})
	start := max(0, len(codeSnapshotIndexes)-2)

	for _, idx := range codeSnapshotIndexes[start:] {
		keepCode[idx] = struct{}{}
	}

	messages := make([]types.Message, 0, len(history))
	var lastAIModel pbcore.AIModel = pbcore.AIModel_AI_MODEL_UNSPECIFIED

	for idx, item := range history {
		// Track latest model
		if item.AiModel != nil {
			lastAIModel = *item.AiModel
		}

		// Skip final thinking messages to avoid context bloating
		if item.Type == pbcore.ConversationMessageType_CONVERSATION_MESSAGE_FINAL_THINKING {
			continue
		}

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
			return nil, lastAIModel, agenterrors.InvalidInput("invalid conversation message role", nil)
		}

		if item.CodeSnapshot != "" {
			_, shouldKeep := keepCode[idx]
			if !shouldKeep {
				message.Content = "[Older generated code omitted. A newer version exists later in the conversation.]"
			} else {
				code, err := services.DownloadCode(ctx, item.CodeSnapshot)
				if err != nil {
					return nil, lastAIModel, fmt.Errorf("failed to download code snapshot: %w", err)
				}

				if item.DefaultCodeData != nil && len(item.DefaultCodeData.Fields) > 0 {
					injectedCode, err := code_builder.InjectDefaultDataGeneratedCode(code, item.DefaultCodeData)
					if err != nil {
						return nil, lastAIModel, fmt.Errorf("failed to inject default code data: %w", err)
					}
					code = injectedCode
				}

				code = code_builder.PreProcess(code)
				message.Content = code
			}
		}

		// References
		if len(item.ReferenceIds) > 0 {
			mediaAssets, err := a.db.GetMediaAssetsByID(ctx, item.ReferenceIds)
			if err != nil {
				return nil, lastAIModel, fmt.Errorf("failed to get media assets: %w", err)
			}

			var imageCount, videoCount int

			for _, mediaAsset := range mediaAssets {
				switch mediaAsset.MediaType {
				case pbcore.MediaType_MEDIA_TYPE_IMAGE:
					imageCount++

				case pbcore.MediaType_MEDIA_TYPE_VIDEO:
					videoCount++
					if mediaAsset.Metadata.Duration == 0 || mediaAsset.Metadata.Duration > 10 {
						return nil, lastAIModel, fmt.Errorf("maximum video duration allowed is 10 seconds")
					}
				}
			}

			// Prevent mixing images + videos
			//if imageCount > 0 && videoCount > 0 {
			//	return nil, lastAIModel, fmt.Errorf("cannot add both image and video assets")
			//}

			// Allow only a single video
			if videoCount > 1 {
				return nil, lastAIModel, fmt.Errorf("only one video media asset is allowed")
			}

			for _, mediaAsset := range mediaAssets {
				if mediaAsset.MediaType == pbcore.MediaType_MEDIA_TYPE_IMAGE {
					img, err := baml_client.NewImageFromUrl(mediaAsset.Path, utils.Ptr(mediaAsset.MimeType))
					if err != nil {
						return nil, lastAIModel, fmt.Errorf("failed to convert image from url: %w", err)
					}
					message.Images = append(message.Images, img)
				}

				if mediaAsset.MediaType == pbcore.MediaType_MEDIA_TYPE_VIDEO {
					video, err := baml_client.NewVideoFromUrl(mediaAsset.Path, utils.Ptr(mediaAsset.MimeType))
					if err != nil {
						return nil, lastAIModel, fmt.Errorf("failed to convert video from url: %w", err)
					}
					message.Videos = append(message.Videos, video)
				}
			}

			builderFromExisting := services.NewMediaAssetRegistryBuilderFromExisting(registry)
			attachments := builderFromExisting.AddAndFormatAssets(mediaAssets)
			message.Content += "\n\nReferences (already provided as image/video input, in the same order as listed below):\n\n" + *attachments
		}

		// Attachments
		if len(item.AssetIds) > 0 {
			attachedAssets, err := a.db.GetMediaAssetsByID(ctx, item.AssetIds)
			if err != nil {
				return nil, lastAIModel, fmt.Errorf("failed to get attached assets: %w", err)
			}

			builderFromExisting := services.NewMediaAssetRegistryBuilderFromExisting(registry)
			attachments := builderFromExisting.AddAndFormatAssets(attachedAssets)
			message.Content += "\n\nAttachments available for use:\n\n" + *attachments
		}

		messages = append(messages, message)
	}

	return messages, lastAIModel, nil
}
