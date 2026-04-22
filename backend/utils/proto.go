package utils

import (
	"encoding/json"
	"fmt"
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

func RawMessageToStruct(raw json.RawMessage) (*structpb.Struct, error) {
	var data map[string]interface{}

	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &data); err != nil {
			return nil, err
		}
	}

	if data == nil {
		data = map[string]interface{}{}
	}

	return structpb.NewStruct(data)
}

// CreateStructFromMap converts map[string]interface{} → *structpb.Struct
func CreateStructFromMap(data map[string]interface{}) *structpb.Struct {
	if data == nil {
		data = map[string]interface{}{}
	}
	s, err := structpb.NewStruct(data)
	if err != nil {
		panic(fmt.Errorf("unable to CreateStructFromMap: %w", err)) // or log.Fatal
	}
	return s
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

	merged := deepMergeMaps(m1, m2)

	s, err := structpb.NewStruct(merged)
	if err != nil {
		panic(fmt.Errorf("unable to MergeStructs: %w", err)) // or log.Fatal
	}
	return s
}

// helper: recursively merge maps
func deepMergeMaps(m1, m2 map[string]interface{}) map[string]interface{} {
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
				result[k] = deepMergeMaps(map1, map2)
				continue
			}
		}
		// otherwise overwrite
		result[k] = v2
	}

	return result
}
