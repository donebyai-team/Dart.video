// DurationCollector and SpeedFactor are browser-safe React contexts.
// probeRender uses react-dom/server and is intentionally NOT exported here —
// it lives in packages/renderer/src/probeRender.ts (server/Node.js only).
export * from './DurationCollector';
export * from './speedFactor';
