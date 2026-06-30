package pbcore

import (
	"database/sql/driver"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/utils"
)

func (v *BrandIdentity) Value() (driver.Value, error) {
	b, err := utils.MarshalProto(v)
	if err != nil {
		return nil, errors.Wrap(err, "brand_identity metadata")
	}
	return b, nil
}

func (v *BrandIdentity) Scan(value any) error {
	err := utils.UnmarshalProto(value, v)
	if err != nil {
		return errors.Wrap(err, "brand_identity metadata")
	}
	return nil
}

func (m MediaType) Extension() string {
	if m == MediaType_MEDIA_TYPE_IMAGE {
		return "png"
	}
	if m == MediaType_MEDIA_TYPE_VIDEO {
		return "mp4"
	}
	if m == MediaType_MEDIA_TYPE_AUDIO {
		return "wav"
	}

	if m == MediaType_MEDIA_TYPE_SVG {
		return "svg"
	}
	return ""
}
