package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"github.com/lib/pq"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
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

const UsageSeparator = "\n\n---USAGE---\n\n"

type Template struct {
	ID          string                `db:"id"`
	Name        string                `db:"name"`
	Version     int                   `db:"version"`
	Categories  TemplateCategories    `db:"categories"`
	Description string                `db:"description"`
	Schema      json.RawMessage       `db:"schema"`
	CreatedAt   time.Time             `db:"created_at"`
	UpdatedAt   *time.Time            `db:"updated_at"`
	Repeatable  bool                  `db:"repeatable"`
	Config      *pbcore.VideoConfig   `db:"config"`
	Metadata    *pbcore.VideoMetadata `db:"metadata"`
	Status      TemplateStatus        `db:"status"`
}

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
