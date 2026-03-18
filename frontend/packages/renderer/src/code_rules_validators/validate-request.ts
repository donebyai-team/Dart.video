import * as Babel from "@babel/standalone";
import { formatPromptRuleViolations, validatePromptRules } from "./prompt-rule-validator";
import { formatTimingRuleViolations, validateTimingRules } from "./timing-rules-validator";
import {
  formatVisualConsistancyRuleViolations,
  validateVisualConsistancyRules,
} from "./visual-consistancy-validator";

export type ValidateRequestParseResult =
  | {
      ok: true;
      code: string;
      outputPath: string;
    }
  | {
      ok: false;
      status: number;
      body: string;
    };

export type ValidationFailureResult =
  | null
  | {
      status: number;
      payload: {
        error_type: "compile_error" | "rule_not_enforced" | "framerules_not_enforced";
        errors: string[];
      };
    };

export function preValidateWithBabel(code: string): string | null {
  try {
    const result = Babel.transform(code, {
      presets: ["react", "typescript"],
      filename: "remote-component.tsx",
      sourceType: "module",
    });
    if (!result?.code) {
      return "Babel produced no output — the code may be empty or malformed";
    }
    return null;
  } catch (err: any) {
    return err?.stack || err?.message || String(err);
  }
}

export function parseValidateRequestBody(body: string): ValidateRequestParseResult {
  try {
    const parsed = JSON.parse(body);
    const code = parsed?.code;
    const outputPath = parsed?.output_path;
    if (!code) throw new Error("code is required");
    if (!outputPath) throw new Error("output_path is required");
    return {
      ok: true,
      code,
      outputPath,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 400,
      body: err?.message || String(err),
    };
  }
}

export function validateGeneratedCode(code: string): ValidationFailureResult {
  const compileError = preValidateWithBabel(code);
  if (compileError) {
    return {
      status: 422,
      payload: {
        error_type: "compile_error",
        errors: [compileError],
      },
    };
  }

  const ruleViolations = validatePromptRules(code);
  if (ruleViolations.length > 0) {
    return {
      status: 422,
      payload: {
        error_type: "rule_not_enforced",
        errors: formatPromptRuleViolations(ruleViolations),
      },
    };
  }

  const timingViolations = validateTimingRules(code);
  if (timingViolations.length > 0) {
    return {
      status: 422,
      payload: {
        error_type: "framerules_not_enforced",
        errors: [
          "Review the FRAME DURATION RULES and feed the error back",
          ...formatTimingRuleViolations(timingViolations),
        ],
      },
    };
  }

  const visualConsistancyViolations = validateVisualConsistancyRules(code);
  if (visualConsistancyViolations.length > 0) {
    return {
      status: 422,
      payload: {
        error_type: "rule_not_enforced",
        errors: formatVisualConsistancyRuleViolations(visualConsistancyViolations),
      },
    };
  }

  return null;
}
