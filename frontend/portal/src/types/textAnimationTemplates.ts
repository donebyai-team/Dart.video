// Re-export types from editor.ts for backward compatibility
export type {
  TemplateProperty,
  TextAnimationTemplate,
  TextAnimationTemplateConfig,
  TextAnimationTemplatesConfig,
} from "./editor";

import type { TextAnimationTemplate } from "./editor";

// Helper to get template by ID from a templates array
export const getTemplateById = (
  templates: TextAnimationTemplate[],
  id: string
): TextAnimationTemplate | undefined => {
  return templates.find((t) => t.id === id);
};

// Helper to get default props for a template
export const getDefaultTemplateProps = (
  templates: TextAnimationTemplate[],
  templateId: string
): Record<string, string | number> => {
  const template = getTemplateById(templates, templateId);
  if (!template) return {};

  return template.properties.reduce((acc, prop) => {
    acc[prop.key] = prop.default;
    return acc;
  }, {} as Record<string, string | number>);
};
