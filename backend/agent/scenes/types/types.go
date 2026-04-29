package types

type ComponentGroup struct {
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Components  []Component `json:"components"`
}

type Component struct {
	Name          string       `json:"name"`
	Type          string       `json:"type"`
	Tags          []string     `json:"tags,omitempty"`
	Schema        []SchemaNode `json:"schema"`
	LLMSchema     []LLMField   `json:"llmSchema"`
	Description   string       `json:"description,omitempty"`
	CELExpression string       `json:"celExpression,omitempty"`
}

type SchemaNode struct {
	Type       string            `json:"type"` // component | repeat | oneof
	Name       string            `json:"name,omitempty"`
	Source     string            `json:"source,omitempty"`
	Fields     []FieldSchema     `json:"fields,omitempty"`     // used when type is component
	Components []ComponentSchema `json:"components,omitempty"` // used when type is repeat
	Map        string            `json:"map,omitempty"`
	Selector   string            `json:"selector,omitempty"`  // oneof
	PropsPath  string            `json:"propsPath,omitempty"` //oneof
}

type ComponentSchema struct {
	Name   string        `json:"name"`
	Fields []FieldSchema `json:"fields"`
}

type FieldType string

const (
	FieldTypeString FieldType = "string"
	FieldTypeArray  FieldType = "array"
	FieldTypeNumber FieldType = "number"
	FieldTypeEnum   FieldType = "enum"
)

type FieldDataType string

const (
	DataTypeColor FieldDataType = "color"
	DataTypeStyle FieldDataType = "style"
	DataTypeText  FieldDataType = "text"
	DataTypeIcon  FieldDataType = "icon"
	DataTypeMedia FieldDataType = "media"
)

type FieldSchema struct {
	Name     string        `json:"name"`
	Type     FieldType     `json:"type"`
	Map      string        `json:"map,omitempty"`
	Default  interface{}   `json:"default,omitempty"`
	DataType FieldDataType `json:"datatype,omitempty"`
}

type LLMField struct {
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Enum     []string    `json:"enum,omitempty"`
	Required *bool       `json:"required,omitempty"`
	Items    *LLMItems   `json:"items,omitempty"`
	Hint     string      `json:"hint,omitempty"`
	Range    string      `json:"range,omitempty"`
	Default  interface{} `json:"default,omitempty"`
}

type LLMItems struct {
	Type   string     `json:"type"`
	Fields []LLMField `json:"fields,omitempty"`
}
