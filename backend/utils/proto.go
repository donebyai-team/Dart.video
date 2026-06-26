package utils

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/baml_client/types"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
)

func MarshalProto(msg proto.Message) ([]byte, error) {
	if msg == nil {
		return nil, nil
	}

	b, err := protojson.MarshalOptions{
		EmitUnpopulated: true,
	}.Marshal(msg)
	if err != nil {
		return nil, fmt.Errorf("proto marshal failed: %w", err)
	}

	return b, nil
}

func UnmarshalProto(value any, msg proto.Message) error {
	if msg == nil {
		return fmt.Errorf("proto message is nil")
	}
	var bs []byte
	switch v := value.(type) {
	case []byte:
		bs = v
	case string:
		bs = []byte(v)
	default:
		return fmt.Errorf("unsupported type %T", value)
	}

	if len(bs) == 0 {
		return nil
	}

	return protojson.Unmarshal(bs, msg)
}

func RawMessageToStructs(raw json.RawMessage) ([]*structpb.Struct, error) {
	var data []map[string]interface{}

	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &data); err != nil {
			return nil, err
		}
	}

	result := make([]*structpb.Struct, 0, len(data))

	for _, item := range data {
		s, err := structpb.NewStruct(item)
		if err != nil {
			return nil, err
		}

		result = append(result, s)
	}

	return result, nil
}

func RawMessageToStruct(raw json.RawMessage) (*structpb.Struct, error) {
	var v any

	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &v); err != nil {
			return nil, err
		}
	}

	var data map[string]any

	switch t := v.(type) {
	case nil:
		data = map[string]any{}
	case map[string]any:
		data = t
	default:
		// Arrays, strings, numbers, booleans, etc. are treated as an empty struct.
		data = map[string]any{}
	}

	return structpb.NewStruct(data)
}

func CreateStructFromDynamicClass(props *types.DynamicProps) (*structpb.Struct, error) {
	if props == nil || props.DynamicProperties == nil {
		return structpb.NewStruct(map[string]any{})
	}

	return structpb.NewStruct(props.DynamicProperties)
}

// MergeStructs merges struct2 into struct1 (deep merge)
func MergeStructs(s1, s2 *structpb.Struct) *structpb.Struct {
	m1 := map[string]interface{}{}
	m2 := map[string]interface{}{}

	if s1 != nil {
		m1 = s1.AsMap()
	}
	if s2 != nil {
		m2 = s2.AsMap()
	}

	merged := DeepMergeMaps(m1, m2)

	s, err := structpb.NewStruct(merged)
	if err != nil {
		panic(fmt.Errorf("unable to MergeStructs: %w", err)) // or log.Fatal
	}
	return s
}

// helper: recursively merge maps
func DeepMergeMaps(m1, m2 map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})

	// copy m1
	for k, v := range m1 {
		result[k] = v
	}

	// merge m2 into result
	for k, v2 := range m2 {
		if v1, exists := result[k]; exists {
			// if both are maps → recurse
			map1, ok1 := v1.(map[string]interface{})
			map2, ok2 := v2.(map[string]interface{})

			if ok1 && ok2 {
				result[k] = DeepMergeMaps(map1, map2)
				continue
			}
		}
		// otherwise overwrite
		result[k] = v2
	}

	return result
}
