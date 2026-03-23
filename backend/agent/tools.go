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
		zap.String("question", question.Question_text),
	)

	if question.ThinkingSummary != nil {
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

	return true, &RunResult{
		Status:          RunStatusWaitingForUserInput,
		AskUserQuestion: &questionCopy,
	}, nil
}

func (a *agentV2) handleToolCalls(
	ctx context.Context,
	session *planningSession,
	llmResponse *types.Union2AskUserQuestionOrVideoPlanV2,
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

	return true, &RunResult{
		Status:          RunStatusWaitingForUserInput,
		AskUserQuestion: &questionCopy,
	}, nil
}

func (a *agentAnimationEditor) handleAnimationGenerationToolCalls(
	ctx context.Context,
	session *generateOrEditAnimationSession,
	llmResponse *types.Union2AskUserQuestionOrEnhancedAnimationPrompt,
	thinking string,
) (bool, *AnimationGenerationAgentRunResult, error) {
	question := llmResponse.AsAskUserQuestion()
	if question == nil {
		return false, nil, nil
	}

	logger := logging.Logger(ctx, a.logger)
	logger.Info("animation generation paused: waiting for user input",
		zap.String("question", question.Question_text),
	)

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: question.Question_text,
	})
	session.AwaitingUserInput = true

	if err := a.saveGenerateOrEditAnimationSession(ctx, session); err != nil {
		return true, nil, agenterrors.SessionUnavailable("failed to save animation generation session with tool call", err)
	}

	questionCopy := *question
	a.publishTransientState(AnimationGeneratorAgentState{
		Thinking:        thinking,
		State:           stateStatusWaiting,
		AskUserQuestion: &questionCopy,
	})

	return true, &AnimationGenerationAgentRunResult{
		Status:          RunStatusWaitingForUserInput,
		AskUserQuestion: &questionCopy,
	}, nil
}
