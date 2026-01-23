import React from "react";
import { interpolate, spring } from "remotion";

// Word-by-word reveal animation
export const WordRevealAnimation: React.FC<{
  text: string;
  frame: number;
  fps: number;
  width: number;
  fontSize?: number;
  color?: string;
}> = ({ text, frame, fps, width, fontSize, color }) => {
  const words = text.split(" ");

  const resolvedFontSize = fontSize ?? Math.min(64, width / 14);
  const resolvedColor = color ?? "#fff";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        maxWidth: width * 0.85,
        zIndex: 1,
      }}
    >
      {words.map((word, i) => {
        const delay = i * 4;
        const animProgress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        const opacity = interpolate(animProgress, [0, 1], [0, 1]);
        const translateY = interpolate(animProgress, [0, 1], [30, 0]);

        return (
          <span
            key={i}
            style={{
              fontSize: resolvedFontSize,
              fontWeight: 700,
              color: resolvedColor,
              opacity,
              transform: `translateY(${translateY}px)`,
              textShadow: "0 4px 30px rgba(99, 102, 241, 0.3)",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Letter cascade animation
export const LetterCascadeAnimation: React.FC<{
  text: string;
  frame: number;
  fps: number;
  width: number;
  fontSize?: number;
  color?: string;
}> = ({ text, frame, fps, width, fontSize, color }) => {
  const letters = text.split("");

  const resolvedFontSize = fontSize ?? Math.min(56, width / 15);
  const resolvedColor = color ?? "#fff";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        maxWidth: width * 0.85,
        zIndex: 1,
      }}
    >
      {letters.map((letter, i) => {
        const delay = i * 1.5;
        const animProgress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 20, stiffness: 150 },
        });

        const opacity = interpolate(animProgress, [0, 1], [0, 1]);
        const translateY = interpolate(animProgress, [0, 1], [-20, 0]);

        return (
          <span
            key={i}
            style={{
              fontSize: resolvedFontSize,
              fontWeight: 700,
              color: resolvedColor,
              opacity,
              transform: `translateY(${translateY}px)`,
              textShadow: "0 2px 20px rgba(147, 51, 234, 0.4)",
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </span>
        );
      })}
    </div>
  );
};

// Typewriter animation
export const TypewriterAnimation: React.FC<{
  text: string;
  frame: number;
  fps: number;
  width: number;
  durationInFrames: number;
  fontSize?: number;
  color?: string;
  showCursor?: boolean;
}> = ({ text, frame, fps, width, durationInFrames, fontSize, color, showCursor }) => {
  const charsPerFrame = text.length / (durationInFrames * 0.6);
  const visibleChars = Math.min(Math.floor(frame * charsPerFrame), text.length);
  const resolvedShowCursor = showCursor ?? true;
  const cursorBlink = frame % 20 < 10;

  const resolvedFontSize = fontSize ?? Math.min(52, width / 16);
  const resolvedColor = color ?? "#fff";

  return (
    <div
      style={{
        maxWidth: width * 0.85,
        zIndex: 1,
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontSize: resolvedFontSize,
          fontWeight: 600,
          color: resolvedColor,
          fontFamily: "monospace",
          textShadow: "0 2px 20px rgba(59, 130, 246, 0.4)",
        }}
      >
        {text.slice(0, visibleChars)}
        {visibleChars < text.length && resolvedShowCursor && cursorBlink && (
          <span style={{ color: "#6366f1" }}>|</span>
        )}
      </span>
    </div>
  );
};

// Scale bounce animation
export const ScaleBounceAnimation: React.FC<{
  text: string;
  frame: number;
  fps: number;
  width: number;
  fontSize?: number;
  color?: string;
}> = ({ text, frame, fps, width, fontSize, color }) => {
  const words = text.split(" ");

  const resolvedFontSize = fontSize ?? Math.min(60, width / 14);
  const resolvedColor = color ?? "#fff";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        maxWidth: width * 0.85,
        zIndex: 1,
      }}
    >
      {words.map((word, i) => {
        const delay = i * 6;
        const animProgress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 8, stiffness: 200 },
        });

        const opacity = interpolate(animProgress, [0, 1], [0, 1]);
        const scale = interpolate(animProgress, [0, 0.7, 1], [0.3, 1.15, 1]);

        return (
          <span
            key={i}
            style={{
              fontSize: resolvedFontSize,
              fontWeight: 800,
              color: resolvedColor,
              opacity,
              transform: `scale(${scale})`,
              textShadow: "0 4px 40px rgba(236, 72, 153, 0.4)",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Blur-in animation
export const BlurInAnimation: React.FC<{
  text: string;
  frame: number;
  fps: number;
  width: number;
  fontSize?: number;
  color?: string;
}> = ({ text, frame, fps, width, fontSize, color }) => {
  const animProgress = spring({
    frame,
    fps,
    config: { damping: 25, stiffness: 80 },
  });

  const opacity = interpolate(animProgress, [0, 1], [0, 1]);
  const blur = interpolate(animProgress, [0, 1], [20, 0]);
  const scale = interpolate(animProgress, [0, 1], [0.9, 1]);

  const resolvedFontSize = fontSize ?? Math.min(58, width / 14);
  const resolvedColor = color ?? "#fff";

  return (
    <div
      style={{
        maxWidth: width * 0.85,
        zIndex: 1,
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontSize: resolvedFontSize,
          fontWeight: 700,
          color: resolvedColor,
          opacity,
          filter: `blur(${blur}px)`,
          transform: `scale(${scale})`,
          textShadow: "0 4px 30px rgba(34, 197, 94, 0.4)",
          display: "inline-block",
        }}
      >
        {text}
      </span>
    </div>
  );
};
