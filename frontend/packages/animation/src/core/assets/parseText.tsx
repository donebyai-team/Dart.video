export interface ParsedTextSegment {
  text: string;
  highlight: boolean;
}

export type ParsedTextLine = ParsedTextSegment[];

export function parseText(text: string): ParsedTextLine[] {
  return text.split("\n").map((line) => {
    const segments: ParsedTextSegment[] = [];

    const regex = /\{([^}]*)\}/g;
    let lastIndex = 0;

    for (const match of line.matchAll(regex)) {
      const start = match.index ?? 0;

      if (start > lastIndex) {
        segments.push({
          text: line.slice(lastIndex, start),
          highlight: false,
        });
      }

      segments.push({
        text: match[1],
        highlight: true,
      });

      lastIndex = start + match[0].length;
    }

    if (lastIndex < line.length) {
      segments.push({
        text: line.slice(lastIndex),
        highlight: false,
      });
    }
    console.log("REgesrgweg", segments)
    return segments;
  });
}