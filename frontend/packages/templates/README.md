# Remotion Template Bundles

This setup is a **Webpack runtime-loaded template bundle** pattern.

You write a Remotion template component in `packages/templates/...`, build it into a standalone browser script, upload that script to CDN, and load it at runtime by template name.

## What this is called

- Bundler: `webpack`
- Pattern: runtime script injection + `window` global export
- In practice: remote template plugin-style loading (not Module Federation)

## Template contract

Each template must export:

```tsx
export { RemoteComponent }
```

Runtime expects:

- `window.__COASTER_TEMPLATE__<TemplateName>.RemoteComponent`

Example:

- template name: `TextCascade`
- global: `window.__COASTER_TEMPLATE__TextCascade`

## Build command

```bash
pnpm build:template <template-folder> 

or
pnpm build:template <template-folder> <template-name> [out-file]
```

Example:

```bash
pnpm build:template text-animation/text-cascade (will auto build Index.tsx)

pnpm build:template text-animation/text-cascade Index text-cascade.cdn.js
```

This does 2 things:

1. Builds CDN artifact to:
   - `packages/build/TextCascade.cdn.js`
2. Copies local test artifact to:
   - `portal/public/templates/TextCascade.cdn.js`

## Runtime loading

Template resolution is name-based:

- CDN URL: `${NEXT_PUBLIC_TEMPLATE_CDN_BASE}/${TemplateName}.cdn.js`
- Local fallback URL: `/templates/${TemplateName}.cdn.js`
- Global key: `__COASTER_TEMPLATE__${TemplateName}`

So if `templateId = "TextCascade"`, runtime tries:

1. CDN: `<CDN_BASE>/TextCascade.cdn.js`
2. Fallback local: `/templates/TextCascade.cdn.js`

## Upload to CDN

Upload `packages/build/<TemplateName>.cdn.js` to your CDN path that matches:

```bash
${NEXT_PUBLIC_TEMPLATE_CDN_BASE}/${TemplateName}.cdn.js
```
