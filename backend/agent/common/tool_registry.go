package common

import (
	"context"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/baml_client/types"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

type ToolRegistry struct {
	state   AgentStatusPublisher
	session AgentSession
	logger  *zap.Logger
}

func NewToolRegistry(state AgentStatusPublisher, session AgentSession, logger *zap.Logger) *ToolRegistry {
	return &ToolRegistry{state: state, session: session, logger: logger}
}

func (a *ToolRegistry) HandleAskQuestion(
	ctx context.Context,
	session *SessionContext,
	question *types.AskUserQuestion,
	thinking string,
	assetRegistry *services.MediaAssetRegistry,
) (bool, *RunResult, error) {
	if question == nil {
		return false, nil, nil
	}

	a.logger.Info("planning paused: waiting for user input",
		zap.String("question", question.Question_text),
	)

	if question.ThinkingSummary != nil && *question.ThinkingSummary != "" {
		session.ConversationHistory = append(session.ConversationHistory, &pbcore.ConversationMessage{
			Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
			Message: *question.ThinkingSummary,
		})
	}

	session.ConversationHistory = append(session.ConversationHistory, &pbcore.ConversationMessage{
		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
		Message: question.Question_text,
	})

	if err := a.session.Save(ctx, session); err != nil {
		return true, nil, agenterrors.SessionUnavailable("failed to save planning session with tool call", err)
	}

	questionCopy := *question
	if err := a.state.Save(ctx, AgentState{
		Thinking: thinking,
		State:    StateStatusWaiting,
	}); err != nil {
		a.logger.Error("failed to update waiting-for-user-input state", zap.Error(err))
		return true, nil, err
	}

	questionProto := toProtoQuestion(&questionCopy)

	if questionCopy.AttachmentUrl != nil {
		asset := assetRegistry.GetAssetFromHandle(*questionCopy.AttachmentUrl)
		if asset != nil {
			questionProto.Asset = asset.ToProto()
		}
	}

	// if no asset is provided while clarification
	// fallback to GENERAL, ideally it should not happen
	if questionProto.Asset == nil && questionCopy.QuestionType == types.AskUserQuestionTypeATTACHMENT_CLARIFICATION {
		questionProto.QuestionType = pbportal.AskUserQuestionType_ASK_USER_QUESTION_TYPE_GENERAL
		if len(questionProto.Options) == 0 {
			questionProto.AllowCustomEntry = utils.Ptr(true)
		}
	}

	return true, &RunResult{
		Status:          RunStatusWaitingForUserInput,
		AskUserQuestion: questionProto,
	}, nil
}

func toProtoQuestion(question *types.AskUserQuestion) *pbportal.AskUserQuestion {
	if question == nil {
		return nil
	}

	proto := &pbportal.AskUserQuestion{
		QuestionType:     pbportal.AskUserQuestionType_ASK_USER_QUESTION_TYPE_UNDEFINED,
		ToolName:         question.Tool_name,
		QuestionText:     question.Question_text,
		Options:          question.Options,
		AllowCustomEntry: question.Allow_custom_entry,
	}

	if question.QuestionType == types.AskUserQuestionTypeGENERIC {
		proto.QuestionType = pbportal.AskUserQuestionType_ASK_USER_QUESTION_TYPE_GENERAL
	} else if question.QuestionType == types.AskUserQuestionTypeATTACHMENT_CLARIFICATION {
		proto.QuestionType = pbportal.AskUserQuestionType_ASK_USER_QUESTION_TYPE_ASSET_CLARIFICATION
	} else if question.QuestionType == types.AskUserQuestionTypeUPLOAD_ATTACHMENT {
		proto.QuestionType = pbportal.AskUserQuestionType_ASK_USER_QUESTION_TYPE_UPLOAD_ASSET
	}

	return proto
}
