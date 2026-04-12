/**
 * Generates prompt markdown files in src/prompt.
 *
 * Usage:
 *   pnpm prompt
 *   pnpm prompt -- --mode only_components_description
 *   pnpm prompt -- --mode json
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { getAnimationPromptJson } from '../src/registry/prompt_generator';

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
  | 'json'
  | undefined;

const shouldPrintToStdout = process.argv.slice(2).includes('--stdout');

if (mode === 'json') {
  const json = getAnimationPromptJson();
  const content = JSON.stringify(json, null, 2);

  if (shouldPrintToStdout) {
    console.log(content);
  } else {
    const outputPath = path.resolve(
      process.cwd(),
      'src/registry/prompt_generator/prompts',
      'scenes-manifest.json',
    );
    writeFileSync(outputPath, `${content}\n`);
    console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
  }
} else {
  const prompt = getAnimationPromptJson();
  const outputPath = path.resolve(
    process.cwd(),
    'src/registry/prompt_generator/prompts',
    'scenes-manifest.json',
  );

  if (shouldPrintToStdout) {
    console.log(prompt);
  } else {
    writeFileSync(outputPath, `${prompt}\n`);
    console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
  }
}
