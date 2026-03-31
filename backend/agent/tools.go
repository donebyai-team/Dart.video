package agent

import (
	"context"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/utils"

	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
)

func (a *agentV2) handleToolCalls(
	ctx context.Context,
	session *planningSession,
	llmResponse *types.Union2AskUserQuestionOrGeneratedVideoPlan,
	thinking string,
) (bool, *RunResult, error) {
	question := llmResponse.AsAskUserQuestion()
	if question == nil {
		return false, nil, nil
	}

	logger := logging.Logger(ctx, a.logger)
	logger.Info("planning paused: waiting for user input",
		zap.String("question", question.Question_text),
	)

	if question.ThinkingSummary != nil && *question.ThinkingSummary != "" {
		session.ConversationHistory = append(session.ConversationHistory, types.Message{
			Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
			Content: *question.ThinkingSummary,
		})
	}

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: question.Question_text,
	})

	if err := a.savePlanningSession(ctx, session); err != nil {
		return true, nil, agenterrors.SessionUnavailable("failed to save planning session with tool call", err)
	}

	questionCopy := *question
	if err := a.updateState(ctx, VideoAgentState{
		Thinking:        thinking,
		State:           stateStatusWaiting,
		AskUserQuestion: &questionCopy,
	}); err != nil {
		logger.Error("failed to update waiting-for-user-input state", zap.Error(err))
		return true, nil, err
	}

	questionProto := toProtoQuestion(&questionCopy)

	if questionCopy.AttachmentUrl != nil {
		asset := a.assetRegistry.GetAssetFromPath(*questionCopy.AttachmentUrl)
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

func (a *sceneGenerator) handleToolCalls(
	ctx context.Context,
	session *planningSession,
	llmResponse *types.Union2AskUserQuestionOrScene,
	thinking string,
) (bool, *RunResult, error) {
	question := llmResponse.AsAskUserQuestion()
	if question == nil {
		return false, nil, nil
	}

	logger := logging.Logger(ctx, a.logger)
	logger.Info("planning paused: waiting for user input",
		zap.String("question", question.Question_text),
	)

	if question.ThinkingSummary != nil && *question.ThinkingSummary != "" {
		session.ConversationHistory = append(session.ConversationHistory, types.Message{
			Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
			Content: *question.ThinkingSummary,
		})
	}

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: question.Question_text,
	})

	if err := a.savePlanningSession(ctx, session); err != nil {
		return true, nil, agenterrors.SessionUnavailable("failed to save planning session with tool call", err)
	}

	questionCopy := *question
	a.publishTransientState(VideoAgentState{
		Thinking:        thinking,
		State:           stateStatusWaiting,
		AskUserQuestion: &questionCopy,
	})

	questionProto := toProtoQuestion(&questionCopy)

	if questionCopy.AttachmentUrl != nil {
		asset := a.assetRegistry.GetAssetFromPath(*questionCopy.AttachmentUrl)
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
