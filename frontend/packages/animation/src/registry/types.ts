export type FieldType =
  | "string"
  | "array"
  | "number"
  | "enum";

export const FieldType = {
  String: "string" as FieldType,
  Array: "array" as FieldType,
  Number: "number" as FieldType,
  Enum: "enum" as FieldType,
};

export type FieldDataType =
  | "color"
  | "style"
  | "text"
  | "icon"
  | "media";

export const FieldDataType = {
  Color: "color" as FieldDataType,
  Style: "style" as FieldDataType,
  Text: "text" as FieldDataType,
  Icon: "icon" as FieldDataType,
  Media: "media" as FieldDataType,
};

export interface FieldSchema {
  name: string;
  type: FieldType;
  map?: string;
  default?: any;
  datatype?: FieldDataType;
}