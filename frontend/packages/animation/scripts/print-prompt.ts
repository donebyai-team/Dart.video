/**
 * Prints the full LLM animation prompt to stdout.
 *
 * Usage:
 *   pnpm prompt
 *   pnpm prompt > prompt.txt
 */
import { getAnimationPrompt } from '../src/prompt/getAnimationPrompt';

console.log(getAnimationPrompt());
