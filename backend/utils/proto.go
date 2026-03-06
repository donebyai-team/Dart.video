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
