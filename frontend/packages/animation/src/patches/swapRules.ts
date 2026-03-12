/** A defined, explicit transformation from one component type to another. */
export interface SwapRule {
  from: string;
  to: string;
  /** Maps source props to target props. Returns the new component's props. */
  transformProps: (fromProps: Record<string, unknown>) => Record<string, unknown>;
}

export const SWAP_RULES: SwapRule[] = [
  // FadeIn ↔ SlideIn
  {
    from: 'FadeIn',
    to: 'SlideIn',
    transformProps: (p) => ({ delay: p['delay'], duration: p['duration'], direction: 'up' }),
  },
  {
    from: 'SlideIn',
    to: 'FadeIn',
    transformProps: (p) => ({ delay: p['delay'], duration: p['duration'] }),
  },
  // FadeIn ↔ ScaleIn
  {
    from: 'FadeIn',
    to: 'ScaleIn',
    transformProps: (p) => ({ delay: p['delay'], duration: p['duration'] }),
  },
  {
    from: 'ScaleIn',
    to: 'FadeIn',
    transformProps: (p) => ({ delay: p['delay'], duration: p['duration'] }),
  },
  // Text → Typewriter
  {
    from: 'Text',
    to: 'Typewriter',
    transformProps: (p) => ({
      text: typeof p['children'] === 'string' ? p['children'] : String(p['children'] ?? ''),
      delay: 0,
      duration: 45,
      mode: 'char',
      variant: p['variant'],
    }),
  },
  // Text → WordCycle
  {
    from: 'Text',
    to: 'WordCycle',
    transformProps: (p) => ({
      words: typeof p['children'] === 'string'
        ? p['children'].split(' ').filter(Boolean)
        : [],
      holdDuration: 45,
      transitionDuration: 12,
      variant: p['variant'],
    }),
  },
  // Typewriter → Text
  {
    from: 'Typewriter',
    to: 'Text',
    transformProps: (p) => ({
      children: p['text'],
      variant: p['variant'],
    }),
  },
];

/** Get all valid swap targets for a given component name. */
export function getSwapTargets(componentName: string): string[] {
  return SWAP_RULES.filter((r) => r.from === componentName).map((r) => r.to);
}

/** Get the swap rule for a specific from→to pair. */
export function getSwapRule(from: string, to: string): SwapRule | undefined {
  return SWAP_RULES.find((r) => r.from === from && r.to === to);
}
