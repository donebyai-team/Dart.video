package agenterrors

import "github.com/shank318/coasterai/errorx"

const (
	ReasonInvalidInput          = "AGENT_INVALID_INPUT"
	ReasonSessionUnavailable    = "AGENT_SESSION_UNAVAILABLE"
	ReasonStateUnavailable      = "AGENT_STATE_UNAVAILABLE"
	ReasonLLMPlanningFailed     = "AGENT_LLM_PLANNING_FAILED"
	ReasonRetrievalFailed       = "AGENT_NO_TEMPLATE_FOUND"
	ReasonNoTemplate            = "AGENT_NO_TEMPLATE_FOUND"
	ReasonTemplateSelectFailed  = "AGENT_TEMPLATE_SELECT_FAILED"
	ReasonTemplateExtractFailed = "AGENT_TEMPLATE_EXTRACT_FAILED"
	ReasonVideoPersistFailed    = "AGENT_VIDEO_PERSIST_FAILED"
	ReasonInternal              = "AGENT_INTERNAL"
)

func InvalidInput(message string, cause error) error {
	return errorx.New(errorx.CodeInvalidArgument, ReasonInvalidInput, message, cause)
}

func SessionUnavailable(message string, cause error) error {
	return errorx.New(errorx.CodeFailedPrecond, ReasonSessionUnavailable, message, cause)
}

func StateUnavailable(message string, cause error) error {
	return errorx.New(errorx.CodeUnavailable, ReasonStateUnavailable, message, cause)
}

func LLMPlanningFailed(message string, cause error) error {
	return errorx.New(errorx.CodeUnavailable, ReasonLLMPlanningFailed, message, cause)
}

func RetrievalFailed(message string, cause error) error {
	return errorx.New(errorx.CodeInternal, ReasonRetrievalFailed, message, cause)
}

func NoTemplateFound(message string, cause error) error {
	return errorx.New(errorx.CodeInternal, ReasonNoTemplate, message, cause)
}

func TemplateSelectFailed(message string, cause error) error {
	return errorx.New(errorx.CodeInternal, ReasonTemplateSelectFailed, message, cause)
}

func TemplateExtractFailed(message string, cause error) error {
	return errorx.New(errorx.CodeInternal, ReasonTemplateExtractFailed, message, cause)
}

func VideoPersistFailed(message string, cause error) error {
	return errorx.New(errorx.CodeInternal, ReasonVideoPersistFailed, message, cause)
}

func Internal(message string, cause error) error {
	return errorx.New(errorx.CodeInternal, ReasonInternal, message, cause)
}
