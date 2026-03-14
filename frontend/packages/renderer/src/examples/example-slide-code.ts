/**
 * Example LLM-generated code mixing primitives with raw HTML elements.
 *
 * Tests the full AST pass:
 *   - Primitives → id="fadein-0", id="text-0" etc. → full toolbar via COMPONENT_REGISTRY
 *   - Raw HTML → id="el-0", id="el-1" etc. → style-only toolbar, style spread injected
 *   - Layout primitives (SafeArea, Stack, Row) → NO id, not selectable
 *
 * After AST pass, expected IDs:
 *   slidein-0   → SlideIn
 *   text-0      → Text ("Welcome")
 *   fadein-0    → FadeIn
 *   el-0        → div (card container)
 *   el-1        → div (metric column)
 *   el-2        → span ("2,847")
 *   el-3        → span ("Revenue")
 *   el-4        → div (metric column)
 *   el-5        → span ("94%")
 *   el-6        → span ("Retention")
 *   el-7        → div (gradient bar)
 *   fadein-1    → FadeIn
 *   text-1      → Text ("Built with primitives + raw HTML")
 *   counter-0   → Counter
 *
 * To test patching raw HTML via browser console:
 *   // Change card background
 *   window.__PATCH_OVERLAY__['el-0'] = { styleOverride: { background: '#1e40af', borderRadius: 24 } }
 *
 *   // Change metric text color + size
 *   window.__PATCH_OVERLAY__['el-2'] = { styleOverride: { color: '#fbbf24', fontSize: 64 } }
 *
 *   // Change gradient bar color
 *   window.__PATCH_OVERLAY__['el-7'] = { styleOverride: { background: 'linear-gradient(90deg, #10b981, #06b6d4)' } }
 */
export const EXAMPLE_SLIDE_CODE = `
export default function RemoteComponent({ data }) {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={24} align="center">

          {/* Primitive: SlideIn + Text */}
          <SlideIn startAt={0} durationInFrames={25} from="bottom">
            <Text variant="display">Welcome</Text>
          </SlideIn>

          {/* Raw HTML card — AST injects id="el-0" + style spread */}
          <FadeIn startAt={20} durationInFrames={20}>
            <div style={{
              padding: 32,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 16,
              display: 'flex',
              gap: 48,
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: '#ffffff' }}>2,847</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Revenue</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: '#ffffff' }}>94%</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Retention</span>
              </div>
            </div>
          </FadeIn>

          {/* Raw HTML gradient bar */}
          <div style={{
            width: 200,
            height: 4,
            background: 'linear-gradient(90deg, #6366f1, #ec4899)',
            borderRadius: 2,
          }} />

          {/* More primitives after raw HTML */}
          <FadeIn startAt={60} durationInFrames={20}>
            <Text variant="body">Built with primitives + raw HTML</Text>
          </FadeIn>

          <Counter startAt={80} durationInFrames={40} from={0} to={100} suffix="%" variant="heading" />

        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`;
