package models

import (
	"database/sql/driver"
	"encoding/json"
	"github.com/lib/pq"
	"github.com/pkg/errors"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"time"
)

////go:generate go-enum -f=$GOFILE
//
//// ENUM(TEXT, VISUAL, STATS, CHART)
//type AnimationType string

type TemplateCategory struct {
	ID            string     `db:"id"`
	AnimationType string     `db:"animation_type"`
	Name          string     `db:"name"`
	Description   string     `db:"description"`
	CreatedAt     time.Time  `db:"created_at"`
	UpdatedAt     *time.Time `db:"updated_at"`
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
	ID            string             `db:"id"`
	Name          string             `db:"name"`
	AnimationType string             `db:"animation_type"`
	Categories    TemplateCategories `db:"categories"`
	Description   string             `db:"description"`
	Schema        json.RawMessage    `db:"schema"`
	PreviewUrl    string             `db:"preview_url"`
	CreatedAt     time.Time          `db:"created_at"`
	UpdatedAt     *time.Time         `db:"updated_at"`
	Repeatable    bool               `db:"repeatable"`
	Config        *TemplateConfig    `db:"config"`

	GeneratedPatches json.RawMessage            `db:"-"` // Maps to edits in slide
	GeneratedPlan    *pbcore.AnimationSlidePlan `db:"-"`
	BackgroundStyle  *pbcore.BackgroundStyle    `db:"-"`
}

type TemplateConfig struct {
	CodeRegistry            *pbcore.CodeRegistry `json:"code_registry"`
	VisibleDurationInFrames int32                `json:"visible_duration"`
	TotalDurationInFrames   int32                `json:"total_duration"`
	Repeatable              bool                 `json:"repeatable"`
	Categories              TemplateCategories   `json:"categories"`
}

func (v *TemplateConfig) Value() (driver.Value, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return nil, errors.Wrap(err, "TemplateConfig metadata")
	}
	return b, nil
}

func (v *TemplateConfig) Scan(value any) error {
	if value == nil {
		*v = TemplateConfig{}
		return nil
	}

	var data []byte

	switch val := value.(type) {
	case []byte:
		data = val
	case string:
		data = []byte(val)
	default:
		return errors.Errorf("unsupported type for TemplateConfig: %T", value)
	}

	if err := json.Unmarshal(data, v); err != nil {
		return errors.Wrap(err, "TemplateConfig metadata")
	}

	return nil
}
