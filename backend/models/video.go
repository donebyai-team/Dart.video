package models

import (
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
	"strings"
	"time"
)

//go:generate go-enum -f=$GOFILE

// ENUM(PROCESSING, COMPLETED, FAILED, PLANNING)
type VideoStatus string

type Video struct {
	ID                string                `db:"id"`
	OrganizationID    string                `db:"organization_id"`
	Status            VideoStatus           `db:"status"`
	Name              string                `db:"name"`
	Version           int                   `db:"version"`
	AIGeneratedConfig *pbcore.VideoConfig   `db:"ai_generated_config"`
	Config            *pbcore.VideoConfig   `db:"config"`
	Script            *pbcore.Script        `db:"script"`
	Metadata          *pbcore.VideoMetadata `db:"metadata"`
	CreatedAt         time.Time             `db:"created_at"`
	UpdatedAt         *time.Time            `db:"updated_at"`
}

func (r *VideoStatus) ToProto() pbcore.VideoStatus {
	value := "VIDEO_STATUS_" + strings.ToUpper(r.String())
	enum, found := pbcore.VideoStatus_value[value]
	if !found {
		panic(fmt.Errorf("unknown video status model %q", r.String()))
	}

	return pbcore.VideoStatus(enum)
}

func (r *Video) ToProto() *pbcore.Video {
	return &pbcore.Video{
		Id:        r.ID,
		Name:      r.Name,
		Version:   int64(r.Version),
		Config:    r.Config,
		Status:    r.Status.ToProto(),
		Metadata:  r.Metadata,
		CreatedAt: timestamppb.New(r.CreatedAt),
	}
}
