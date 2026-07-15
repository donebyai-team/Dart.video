package common

import "github.com/shank318/coasterai/models"

type LLMResponse[T any] struct {
	Response T
	Summary  *string
	Usage    *models.CreditLedgerEntry
}
