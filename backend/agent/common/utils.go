package common

import (
	"encoding/json"
	"github.com/shank318/coasterai/baml_client/types"
	"reflect"
)

func ConvertBamlJSONToMap[T any](props types.Union2ListMapStringKeyJSONValueOrMapStringKeyJSONValue) (T, error) {
	var result T

	data, err := props.MarshalJSON()
	if err != nil {
		return result, err
	}

	// Normal case.
	if err := json.Unmarshal(data, &result); err == nil {
		return result, nil
	}

	// Special case: T is a slice but JSON is a single object.
	t := reflect.TypeOf(result)
	if t.Kind() == reflect.Slice && len(data) > 0 && data[0] == '{' {
		elem := reflect.New(t.Elem())

		if err := json.Unmarshal(data, elem.Interface()); err != nil {
			return result, err
		}

		slice := reflect.MakeSlice(t, 1, 1)
		slice.Index(0).Set(elem.Elem())

		return slice.Interface().(T), nil
	}

	return result, err
}
