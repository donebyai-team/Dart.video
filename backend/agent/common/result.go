package common

import (
	"github.com/shank318/coasterai/models"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
)

type RunStatus string

const (
	RunStatusCompleted           RunStatus = "COMPLETED"
	RunStatusWaitingForUserInput RunStatus = "WAITING_FOR_USER_INPUT"
)

type RunResult struct {
	Status             RunStatus
	AskUserQuestion    *pbportal.AskUserQuestion
	GeneratedAnimation *models.Template
}
