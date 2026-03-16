/**
 * Prints the full LLM animation prompt to stdout.
 *
 * Usage:
 *   pnpm prompt
 *   pnpm prompt -- --mode only_components_description
 *   pnpm prompt > prompt.txt
 */
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

console.log(getAnimationPrompt(mode ? { mode } : undefined));
