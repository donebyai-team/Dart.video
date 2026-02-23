package template_validator

import (
	"encoding/json"
	"errors"
	"fmt"
)

type ResponseFormatJSONSchema struct {
	Name   string                           `json:"name"`
	Schema ResponseFormatJSONSchemaProperty `json:"schema"`
}

type ResponseFormatJSONSchemaProperty struct {
	Type        string                                      `json:"type,omitempty"`
	Description string                                      `json:"description,omitempty"`
	Enum        []string                                    `json:"enum,omitempty"`
	Properties  map[string]ResponseFormatJSONSchemaProperty `json:"properties,omitempty"`
	Required    []string                                    `json:"required,omitempty"`
}

// Entry point
func ValidateUserSchema(input []byte) (*ResponseFormatJSONSchema, error) {
	var schema ResponseFormatJSONSchema

	if err := json.Unmarshal(input, &schema); err != nil {
		return nil, fmt.Errorf("invalid schema format: %w", err)
	}

	if schema.Name == "" {
		return nil, errors.New("missing schema name")
	}

	if schema.Schema.Type != "object" {
		return nil, errors.New("root schema type must be 'object'")
	}

	if err := validateProperty(schema.Schema); err != nil {
		return nil, err
	}

	return &schema, nil
}

func validateProperty(prop ResponseFormatJSONSchemaProperty) error {
	allowedTypes := map[string]bool{
		"object":  true,
		"string":  true,
		"number":  true,
		"integer": true,
		"boolean": true,
		"array":   true,
	}

	if prop.Type == "" {
		return errors.New("property missing type")
	}

	if !allowedTypes[prop.Type] {
		return fmt.Errorf("invalid type: %s", prop.Type)
	}

	// If object, validate nested properties
	if prop.Type == "object" {
		if len(prop.Properties) == 0 {
			return errors.New("object type must define properties")
		}

		// Ensure required fields exist inside properties
		for _, req := range prop.Required {
			if _, exists := prop.Properties[req]; !exists {
				return fmt.Errorf("required field '%s' not found in properties", req)
			}
		}

		for name, nested := range prop.Properties {
			if err := validateProperty(nested); err != nil {
				return fmt.Errorf("invalid property '%s': %w", name, err)
			}
		}
	}

	// If enum exists, type must be string
	if len(prop.Enum) > 0 && prop.Type != "string" {
		return errors.New("enum is only allowed for string type")
	}

	return nil
}
