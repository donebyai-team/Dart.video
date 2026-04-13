import { z } from 'zod';
import { AspectPreset } from '../../styles/AspectPresetContext';

export function frameContractFragment(): string {
  return [
    '## FRAME CONTRACT:',
    '',
    '- Your component runs inside a managed animation runtime.',
    '- It receives no props.',
    '- Export as: export default function RemoteComponent() { ... }',
    '- Remotion and all animation libraries are provided by the runtime — never import them.',
  ].join('\n');
}

export function canvasDimensionsFragment(preset: AspectPreset): string {
  return [
    '## Available CANVAS size:',
    `${preset.width}px × ${preset.height}px (${preset.id})`,
  ].join('\n');
}

/**
 * Unwrap Zod wrappers (ZodOptional, ZodDefault, ZodNullable) to get the inner type.
 */
function unwrapZod(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapZod(schema._def.innerType);
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapZod(schema._def.innerType);
  }
  return schema;
}

/**
 * Extract a human-readable type hint from a Zod schema field.
 * Returns strings like "number", "string", or "enum(up|down|left|right)".
 */
function describeZodType(schema: z.ZodTypeAny): string {
  const inner = unwrapZod(schema);
  if (inner instanceof z.ZodEnum) {
    return `enum(${(inner._def.values as string[]).join('|')})`;
  }
  if (inner instanceof z.ZodNumber) return 'number';
  if (inner instanceof z.ZodString) return 'string';
  if (inner instanceof z.ZodArray) return 'array';
  return 'any';
}