package common

import (
	"context"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/baml_client/types"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/providers"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"strings"
)

type ToolRegistry struct {
	state           AgentStatusPublisher
	session         AgentSession
	logger          *zap.Logger
	firecrawlClient *providers.FirecrawlClient
}

func NewToolRegistry(
	state AgentStatusPublisher,
	session AgentSession,
	firecrawlClient *providers.FirecrawlClient,
	logger *zap.Logger) *ToolRegistry {
	return &ToolRegistry{state: state, session: session, logger: logger, firecrawlClient: firecrawlClient}
}

func (a *ToolRegistry) HandleScriptPlanner(ctx context.Context,
	session *SessionContext,
	llmResponse *types.Union3ListAskUserQuestionOrScriptOrToolExtractContent,
	thinkingSummary *string,
	assetRegistry *services.MediaAssetRegistry) (*RunResult, error) {

	if llmResponse.IsListAskUserQuestion() {
		if llmResponse.AsListAskUserQuestion() == nil {
			return nil, errors.New("questions are invalid")
		}
		return a.handleAskQuestion(ctx, session, llmResponse.AsListAskUserQuestion(), thinkingSummary, assetRegistry)
	}

	if llmResponse.IsScript() && llmResponse.AsScript() != nil {
		script := pbcore.Script{}
		bamlScript := *llmResponse.AsScript()
		for _, scriptItem := range bamlScript.Sections {
			script.Items = append(script.Items, &pbcore.ScriptItem{
				Name:      string(scriptItem.Name),
				Narattion: scriptItem.Narration,
			})
		}
		return &RunResult{
			Status: RunStatusWaitingForUserInput,
			AskUserQuestions: []*pbportal.AskUserQuestion{
				{
					QuestionText:     "Confirm if the script looks good?",
					AllowCustomEntry: utils.Ptr(true),
					QuestionType:     pbportal.AskUserQuestionType_ASK_USER_QUESTION_TYPE_SCRIPT,
					Script:           &script,
				},
			},
		}, nil
	}

	if llmResponse.IsToolExtractContent() && llmResponse.AsToolExtractContent() != nil {
		return a.handleExtractContent(ctx, session, llmResponse.AsToolExtractContent(), thinkingSummary, assetRegistry)
	}

	return nil, errors.New("llmResponse is invalid")
}

func (a *ToolRegistry) HandleAnimationGeneration(
	ctx context.Context,
	session *SessionContext,
	llmResponse *types.Union2AskUserQuestionOrGenerateAnimationCodeResponse,
	thinkingSummary *string,
	assetRegistry *services.MediaAssetRegistry) (*RunResult, error) {
	if llmResponse == nil {
		return nil, errors.New("llmResponse is nil")
	}

	if llmResponse.IsAskUserQuestion() {
		if llmResponse.AsAskUserQuestion() == nil {
			return nil, errors.New("questions are invalid")
		}
		return a.handleAskQuestion(ctx, session, &[]types.AskUserQuestion{*llmResponse.AsAskUserQuestion()}, thinkingSummary, assetRegistry)
	}

	if llmResponse.IsGenerateAnimationCodeResponse() && llmResponse.AsGenerateAnimationCodeResponse() != nil {
		return &RunResult{
			Status: RunStatusCompleted,
		}, nil
	}

	return nil, errors.New("llmResponse is invalid")
}

func (a *ToolRegistry) handleExtractContent(
	ctx context.Context,
	session *SessionContext,
	params *types.ToolExtractContent,
	thinkingSummary *string,
	assetRegistry *services.MediaAssetRegistry,
) (*RunResult, error) {

	if thinkingSummary != nil && *thinkingSummary != "" {
		session.AddMessage(&pbcore.ConversationMessage{
			Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
			Type:    pbcore.ConversationMessageType_CONVERSATION_MESSAGE_THINKING,
			Message: *thinkingSummary,
		})
	}

	session.AddMessage(&pbcore.ConversationMessage{
		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_TOOL,
		Message: fmt.Sprintf("Extract content from: %s", strings.Join(params.Links, ",")),
	})

	a.state.Publish(AgentState{
		Thinking: "Extracting content from provided links..",
		State:    StateStatusProcessing,
	})

	for _, link := range params.Links {
		a.logger.Info("extracting content from link:",
			zap.String("link", link),
		)

		scrapeResponse, err := a.firecrawlClient.Scrape(ctx, providers.ScrapeRequest{
			URL:             link,
			Formats:         []providers.Format{{"markdown"}},
			OnlyMainContent: utils.Ptr(true),
			Parsers:         []providers.Parser{{Type: "pdf", MaxPages: 5}},
			RemoveBase64:    utils.Ptr(true),
		})
		if err != nil {
			if errors.Is(err, providers.ErrUnsupportedWebsite) {
				a.logger.Warn("unsupported website, skipping",
					zap.String("link", link),
				)

				session.AddMessage(&pbcore.ConversationMessage{
					Role: pbcore.ConversationRole_CONVERSATION_ROLE_TOOL,
					Message: fmt.Sprintf(
						"Unable to extract content from %s because this website is not supported. Ask user to provide valid link",
						link,
					),
				})

				continue
			}
			a.logger.Error("failed to scrape provided link", zap.Error(err))
			return nil, fmt.Errorf("failed to scrape provided link: %w", err)
		}

		if scrapeResponse.Data.Markdown != "" {
			session.AddMessage(&pbcore.ConversationMessage{
				Role:    pbcore.ConversationRole_CONVERSATION_ROLE_USER,
				Message: fmt.Sprintf("Extracted content from %s \n\n %s", link, scrapeResponse.Data.Markdown),
			})
		} else {
			return nil, fmt.Errorf("no content extracted from : %s", link)
		}
	}

	if err := a.session.Save(ctx, session); err != nil {
		return nil, agenterrors.SessionUnavailable("failed to save planning session with tool call", err)
	}

	return &RunResult{
		Status: RunStatusContinue,
	}, nil
}

func (a *ToolRegistry) handleAskQuestion(
	ctx context.Context,
	session *SessionContext,
	questions *[]types.AskUserQuestion,
	thinkingSummary *string,
	assetRegistry *services.MediaAssetRegistry,
) (*RunResult, error) {
	if thinkingSummary != nil && *thinkingSummary != "" {
		session.AddMessage(&pbcore.ConversationMessage{
			Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
			Type:    pbcore.ConversationMessageType_CONVERSATION_MESSAGE_THINKING,
			Message: *thinkingSummary,
		})
	}

	questionsAsked := "Questions:"
	for _, question := range *questions {
		questionsAsked += "\n- " + question.Question_text
	}

	a.logger.Info("planning paused: waiting for user input",
		zap.String("question", questionsAsked),
	)

	session.AddMessage(&pbcore.ConversationMessage{
		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_TOOL,
		Message: questionsAsked,
	})

	if err := a.session.Save(ctx, session); err != nil {
		return nil, agenterrors.SessionUnavailable("failed to save planning session with tool call", err)
	}

	if err := a.state.Save(ctx, AgentState{
		State: StateStatusWaiting,
	}); err != nil {
		a.logger.Error("failed to update waiting-for-user-input state", zap.Error(err))
		return nil, err
	}

	questionsProtos := make([]*pbportal.AskUserQuestion, 0, len(*questions))
	for _, question := range *questions {
		questionCopy := question
		questionProto := toProtoQuestion(&questionCopy)
		if questionCopy.AttachmentUrl != nil {
			asset := assetRegistry.GetAssetFromHandle(*questionCopy.AttachmentUrl)
			if asset != nil {
				questionProto.Asset = asset.ToProto()
			}
		}

		// if no asset is provided while clarification
		// fallback to GENERAL, ideally it should not happen
		//if questionProto.Asset == nil && questionCopy.QuestionType == types.AskUserQuestionTypeATTACHMENT_CLARIFICATION {
		//	questionProto.QuestionType = pbportal.AskUserQuestionType_ASK_USER_QUESTION_TYPE_GENERAL
		//	if len(questionProto.Options) == 0 {
		//		questionProto.AllowCustomEntry = utils.Ptr(true)
		//	}
		//}

		questionsProtos = append(questionsProtos, questionProto)
	}

	return &RunResult{
		Status:           RunStatusWaitingForUserInput,
		AskUserQuestions: questionsProtos,
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
	} else if question.QuestionType == types.AskUserQuestionTypeUPLOAD_ATTACHMENT {
		proto.QuestionType = pbportal.AskUserQuestionType_ASK_USER_QUESTION_TYPE_UPLOAD_ASSET
	}

	return proto
}
