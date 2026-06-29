package common

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
)

type RunStatus string

const (
	RunStatusCompleted           RunStatus = "COMPLETED"
	RunStatusWaitingForUserInput RunStatus = "WAITING_FOR_USER_INPUT"
)

type RunResult struct {
	Status             RunStatus
	AskUserQuestions   []*pbportal.AskUserQuestion
	GeneratedAnimation *pbcore.Slide
}
