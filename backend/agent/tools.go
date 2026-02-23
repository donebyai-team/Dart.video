package agent

import (
	"context"

	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
)

func (a *agentV1) handleToolCalls(
	ctx context.Context,
	sessionID string,
	session *planningSession,
	llmResponse *types.Union2AskUserQuestionOrVideoGenerationPlan,
	thinking string,
) (bool, *RunResult, error) {
	question := llmResponse.AsAskUserQuestion()
	if question == nil {
		return false, nil, nil
	}

	logger := logging.Logger(ctx, a.logger)
	logger.Info("planning paused: waiting for user input",
		zap.String("session_id", sessionID),
		zap.String("question", question.Question_text),
	)

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: question.Question_text,
	})

	if err := a.savePlanningSession(ctx, sessionID, session); err != nil {
		return true, nil, agenterrors.SessionUnavailable("failed to save planning session with tool call", err)
	}

	questionCopy := *question
	if err := a.updateState(ctx, VideoState{
		VideoID:         sessionID,
		Thinking:        thinking,
		State:           stateStatusWaiting,
		AskUserQuestion: &questionCopy,
	}); err != nil {
		logger.Warn("failed to update waiting-for-user-input state", zap.Error(err))
	}

	return true, &RunResult{
		Status:          RunStatusWaitingForUserInput,
		AskUserQuestion: &questionCopy,
	}, nil
}
