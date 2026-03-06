package pbcore

import (
	"database/sql/driver"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/utils"
)

func (v *VideoMetadata) Value() (driver.Value, error) {
	b, err := utils.MarshalProto(v)
	if err != nil {
		return nil, errors.Wrap(err, "video metadata")
	}
	return b, nil
}

func (v *VideoMetadata) Scan(value any) error {
	err := utils.UnmarshalProto(value, v)
	if err != nil {
		return errors.Wrap(err, "video metadata")
	}
	return nil
}

func (v *VideoConfig) Value() (driver.Value, error) {
	b, err := utils.MarshalProto(v)
	if err != nil {
		return nil, errors.Wrap(err, "video metadata")
	}
	return b, nil
}

func (v *VideoConfig) Scan(value any) error {
	err := utils.UnmarshalProto(value, v)
	if err != nil {
		return errors.Wrap(err, "video metadata")
	}
	return nil
}

func (v *Script) Value() (driver.Value, error) {
	b, err := utils.MarshalProto(v)
	if err != nil {
		return nil, errors.Wrap(err, "video metadata")
	}
	return b, nil
}

func (v *Script) Scan(value any) error {
	err := utils.UnmarshalProto(value, v)
	if err != nil {
		return errors.Wrap(err, "video metadata")
	}
	return nil
}

func (v *CodeRegistry) Value() (driver.Value, error) {
	b, err := utils.MarshalProto(v)
	if err != nil {
		return nil, errors.Wrap(err, "CodeRegistry metadata")
	}
	return b, nil
}

func (v *CodeRegistry) Scan(value any) error {
	err := utils.UnmarshalProto(value, v)
	if err != nil {
		return errors.Wrap(err, "CodeRegistry metadata")
	}
	return nil
}

func (v *AnimationSlidePlan) ToModel() *types.AnimationSlide {
	return &types.AnimationSlide{
		Index:                       v.Index,
		BeatDescription:             v.BeatDescription,
		AnimationType:               types.AnimationType(v.AnimationType),
		CategorySearchQuery:         v.CategorySearcQquery,
		Duration:                    v.Duration,
		Voiceover:                   v.Voiceover,
		SelectedTemplateDescription: v.SelectedTemplateDescription,
	}
}

func (v *MediaSlidePlan) ToModel() *types.MediaSlide {
	return &types.MediaSlide{
		Index:                       v.Index,
		BeatDescription:             v.BeatDescription,
		Duration:                    v.Duration,
		SelectedTemplateDescription: v.SelectedTemplateDescription,
	}
}
