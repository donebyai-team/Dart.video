package models

import (
	"database/sql/driver"
	"encoding/json"
	"github.com/lib/pq"
	"github.com/shank318/coasterai/baml_client/types"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"time"
)

////go:generate go-enum -f=$GOFILE
//
//// ENUM(TEXT, VISUAL, STATS, CHART)
//type AnimationType string

type TemplateCategory struct {
	ID            string              `db:"id"`
	AnimationType types.AnimationType `db:"animation_type"`
	Name          string              `db:"name"`
	Description   string              `db:"description"`
	CreatedAt     time.Time           `db:"created_at"`
	UpdatedAt     *time.Time          `db:"updated_at"`
}

type TemplateCategories []string

func (a TemplateCategories) Value() (driver.Value, error) {
	strs := make([]string, len(a))
	for i, v := range a {
		strs[i] = string(v)
	}
	return pq.Array(strs).Value()
}

func (a *TemplateCategories) Scan(src interface{}) error {
	var stringArray []string
	if src == nil {
		*a = nil
		return nil
	}
	if err := pq.Array(&stringArray).Scan(src); err != nil {
		return err
	}

	result := make([]string, len(stringArray))
	for i, v := range stringArray {
		result[i] = string(v)
	}
	*a = result
	return nil
}

type Template struct {
	ID              string               `db:"id"`
	Name            string               `db:"name"`
	AnimationType   types.AnimationType  `db:"animation_type"`
	Categories      TemplateCategories   `db:"categories"`
	Description     string               `db:"description"`
	Schema          json.RawMessage      `db:"schema"`
	CodeRegistry    *pbcore.CodeRegistry `db:"code_registry"`
	PreviewUrl      string               `db:"preview_url"`
	CreatedAt       time.Time            `db:"created_at"`
	UpdatedAt       *time.Time           `db:"updated_at"`
	Repeatable      bool                 `db:"repeatable"`
	ElementRegistry json.RawMessage      `db:"element_registry"`

	GeneratedConfig json.RawMessage            `db:"-"` // Maps to edits in slide
	GeneratedPlan   *pbcore.AnimationSlidePlan `db:"-"`
	Duration        int64                      `db:"-"`
}
