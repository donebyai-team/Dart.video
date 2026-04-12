import { ComponentRegistration } from '..';
import { SCENE_COMPONENTS } from '../scenes';
import { AVAILABLE_ENUMS } from './enums';

interface ComponentGroup {
  title: string;
  description: string;
  components: ComponentRegistration[];
}

const COMPONENT_GROUPS: ComponentGroup[] = [
  { title: 'Scenes', description: 'standalone, no siblings', components: SCENE_COMPONENTS },
];

// ── JSON schema helpers ──────────────────────────────────────────────

// function unwrapZod(schema: z.ZodTypeAny): z.ZodTypeAny {
//   if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
//     return unwrapZod(schema._def.innerType);
//   }
//   if (schema instanceof z.ZodDefault) {
//     return unwrapZod(schema._def.innerType);
//   }
//   return schema;
// }

// function getArraySubtype(schema: z.ZodTypeAny): string | undefined {
//   const inner = unwrapZod(schema);

//   if (inner instanceof z.ZodArray) {
//     const element = unwrapZod(inner.element);

//     // use description if present
//     if (element.description) {
//       return element.description;
//     }

//     return describeZodType(element);
//   }

//   return undefined;
// }

// function describeZodType(schema: z.ZodTypeAny): string {
//   const inner = unwrapZod(schema);

//   if (inner instanceof z.ZodEnum) {
//     return `enum(${inner._def.values.join("|")})`;
//   }

//   if (inner instanceof z.ZodString) return "string";
//   if (inner instanceof z.ZodNumber) return "number";
//   if (inner instanceof z.ZodBoolean) return "boolean";
//   if (inner instanceof z.ZodObject) return "object";
//   if (inner instanceof z.ZodArray) return "array";

//   return "any";
// }

// function getZodDefault(schema: z.ZodTypeAny): unknown | undefined {
//   if (schema instanceof z.ZodDefault) {
//     return schema._def.defaultValue();
//   }
//   if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
//     return getZodDefault(schema._def.innerType);
//   }
//   if (schema instanceof z.ZodEffects) {
//     return getZodDefault(schema._def.schema);
//   }
//   return undefined;
// }

interface PropJson {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  subtype?: string;
}

interface ComponentJson {
  name: string;
  tags: string[];
  id: string;
  description: string;
  schema?: JSON;
  llmSchema?: JSON;
  durationExpression?: string;
}

interface ComponentGroupJson {
  title: string;
  description: string;
  components: ComponentRegistration[];
}

interface SceneRegistry {
  available_enums: any
  components: ComponentGroupJson[];
}

function getComponentGroupsJson(): ComponentGroupJson[] {
  return COMPONENT_GROUPS
    .filter((g) => g.components.length > 0)
    .map((g) => ({
      title: g.title,
      description: g.description,
      components: g.components,
    }));
}

export function getAnimationPromptJson(): SceneRegistry {
  return {
    available_enums: AVAILABLE_ENUMS,
    components: getComponentGroupsJson(),
  };
}
