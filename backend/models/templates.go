package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"github.com/lib/pq"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
	"strconv"
	"strings"
	"time"
)

// //go:generate go-enum -f=$GOFILE

// ENUM(CREATED, WAITING, AVAILABLE)
type TemplateStatus string

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

type TemplateEmbedding []float64

func (e TemplateEmbedding) Value() (driver.Value, error) {
	if e == nil {
		return nil, nil
	}

	parts := make([]string, len(e))
	for i, value := range e {
		parts[i] = strconv.FormatFloat(value, 'f', -1, 64)
	}

	return "[" + strings.Join(parts, ",") + "]", nil
}

func (e *TemplateEmbedding) Scan(src interface{}) error {
	if src == nil {
		*e = nil
		return nil
	}

	var raw string
	switch value := src.(type) {
	case string:
		raw = value
	case []byte:
		raw = string(value)
	default:
		return fmt.Errorf("unsupported template embedding type %T", src)
	}

	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "[]" {
		*e = TemplateEmbedding{}
		return nil
	}

	if !strings.HasPrefix(raw, "[") || !strings.HasSuffix(raw, "]") {
		return fmt.Errorf("invalid vector format %q", raw)
	}

	parts := strings.Split(raw[1:len(raw)-1], ",")
	result := make([]float64, len(parts))
	for i, part := range parts {
		parsed, err := strconv.ParseFloat(strings.TrimSpace(part), 64)
		if err != nil {
			return fmt.Errorf("parse vector value %q: %w", part, err)
		}
		result[i] = parsed
	}

	*e = result
	return nil
}

type Template struct {
	ID                   string                `db:"id"`
	Name                 string                `db:"name"`
	Version              int                   `db:"version"`
	Categories           TemplateCategories    `db:"categories"`
	Description          string                `db:"description"`
	DescriptionEmbedding TemplateEmbedding     `db:"description_embedding"`
	Schema               json.RawMessage       `db:"schema"`
	CreatedAt            time.Time             `db:"created_at"`
	UpdatedAt            *time.Time            `db:"updated_at"`
	Repeatable           bool                  `db:"repeatable"`
	Config               *pbcore.VideoConfig   `db:"config"`
	Metadata             *pbcore.VideoMetadata `db:"metadata"`
	Status               TemplateStatus        `db:"status"`
}

const UsageSeparator = "\n\n---USAGE---\n\n"

func (r *Template) GetDescription() string {
	description, _, found := strings.Cut(r.Description, UsageSeparator)
	if !found {
		return strings.TrimSpace(r.Description)
	}
	return strings.TrimSpace(description)
}

func (r *Template) GetUsageDescription() string {
	_, usage, found := strings.Cut(r.Description, UsageSeparator)
	if !found {
		return ""
	}
	return strings.TrimSpace(usage)
}

func (r *Template) ToProto() *pbcore.AnimationTemplate {
	return &pbcore.AnimationTemplate{
		Id:          r.ID,
		Name:        r.Name,
		Version:     int64(r.Version),
		Config:      r.Config,
		Status:      r.Status.String(),
		Metadata:    r.Metadata,
		Description: r.Description,
		Categories:  r.Categories,
		CreatedAt:   timestamppb.New(r.CreatedAt),
	}
}

func (r *Template) ToModelVideo() *Video {
	return &Video{
		ID:         fmt.Sprintf("template:%s", r.ID),
		Name:       r.Name,
		Version:    r.Version,
		Config:     r.Config,
		Metadata:   r.Metadata,
		IsTemplate: true,
		Status:     VideoStatusCOMPLETED,
	}
}

func (r *Template) ToVideo() *pbcore.Video {
	return &pbcore.Video{
		Id:        fmt.Sprintf("template:%s", r.ID),
		Name:      r.Name,
		Version:   int64(r.Version),
		Config:    r.Config,
		Status:    pbcore.VideoStatus_VIDEO_STATUS_COMPLETED,
		Metadata:  r.Metadata,
		CreatedAt: timestamppb.New(r.CreatedAt),
	}
}

type TemplateCursor struct {
	Categories    []string  `json:"categories"`
	MatchPriority int       `json:"matchPriority"`
	CreatedAt     time.Time `json:"createdAt"`
	ID            string    `json:"id"`
}

type TemplatePage struct {
	Templates  []Template
	NextCursor *string
}
