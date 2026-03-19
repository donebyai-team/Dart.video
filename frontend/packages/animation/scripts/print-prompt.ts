/**
 * Generates prompt markdown files in src/prompt.
 *
 * Usage:
 *   pnpm prompt
 *   pnpm prompt -- --mode only_components_description
 *   pnpm prompt -- --mode only_components_description --stdout
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { getAnimationPrompt } from '../src/prompt/getAnimationPrompt';

function getFlagValue(args: string[], name: string): string | undefined {
  const exact = `--${name}`;
  const withEqPrefix = `--${name}=`;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === exact) {
      const next = args[i + 1];
      if (next && !next.startsWith('--')) return next;
      return undefined;
    }
    if (a.startsWith(withEqPrefix)) {
      return a.slice(withEqPrefix.length);
    }
  }

  return undefined;
}

const mode = getFlagValue(process.argv.slice(2), 'mode') as
  | 'only_components_description'
  | undefined;

const shouldPrintToStdout = process.argv.slice(2).includes('--stdout');
const prompt = getAnimationPrompt(mode ? { mode } : undefined);
const outputPath = path.resolve(
  process.cwd(),
  'src/prompt',
  mode === 'only_components_description' ? 'prompt_list_components.md' : 'Prompt.md',
);

if (shouldPrintToStdout) {
  console.log(prompt);
} else {
  writeFileSync(outputPath, `${prompt}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
}
