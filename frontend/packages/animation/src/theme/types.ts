import { ColorTokens } from '../tokens/colors';

/**
 * Brand identity provided by the user/client.
 * Minimal by design — only what changes per client.
 * ThemeProvider derives the full ResolvedTheme from this.
 */
export interface BrandTheme {
  /** Brand primary color (e.g. "#6366f1") */
  primary: string;
  /** Brand secondary / tint color (e.g. "#a5b4fc") */
  secondary: string;
  /** Canvas / slide background (e.g. "#0f0f0f") */
  bg: string;
  /** Primary text color (e.g. "#f8fafc") */
  text: string;
  /** Brand sans-serif font (e.g. "Inter"). Falls back to system-ui. */
  font?: string;
  /** Brand monospace font (e.g. "JetBrains Mono"). Falls back to system mono stack. */
  fontMono?: string;
  /** Brand serif font (e.g. "Playfair Display"). Falls back to Georgia, serif. */
  fontSerif?: string;
  /** Optional brand logo URL */
  logo?: string;
}

/**
 * Fully resolved theme — derived by ThemeProvider from BrandTheme.
 * This is what components consume via useTheme().
 * Contains the full 26-slot color palette + resolved font stacks.
 * Never constructed manually — always derived from BrandTheme.
 */
export interface ResolvedTheme {
  colors: ColorTokens;
  /** Resolved sans font stack (brand font + system fallbacks) */
  font: string;
  /** Resolved mono font stack (brand mono font + system fallbacks) */
  fontMono: string;
  /** Resolved serif font stack (brand serif font + system fallbacks) */
  fontSerif: string;
}
