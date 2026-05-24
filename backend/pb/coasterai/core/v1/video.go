package pbcore

import (
	"database/sql/driver"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/utils"
	"strings"
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

func migrateConfig(s string) string {
	replacements := map[string]string{
		`TextStagger`:   `AnimatedText`,
		`TextHighlight`: `AnimatedText`,

		`textstagger`:   `animatedtext`,
		`texthighlight`: `animatedtext`,
	}

	for old, newVal := range replacements {
		s = strings.ReplaceAll(s, old, newVal)
	}

	return s
}

func (v *VideoConfig) Scan(value any) error {
	raw, ok := value.([]byte)
	if !ok {
		return errors.New("invalid value type")
	}

	migrated := migrateConfig(string(raw))

	if err := utils.UnmarshalProto([]byte(migrated), v); err != nil {
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
