# Adding a New Scene Component

This guide outlines the steps to create a new scene component in the animation library.

## 1. Create the Component File

Create a new file in the appropriate subdirectory:
- `text/` - Text-based animations (e.g., TextStagger, Typewriter)
- `assets/` - Asset-based animations (e.g., AnimatedImage, ImagePeel)

```
src/components/scenes/text/MyNewScene.tsx
src/components/scenes/assets/MyNewScene.tsx
```

## 2. Define Default Constants

All defaults should be defined as constants at the top of the file using `as const` for type safety:

```typescript
// Default constants
const DEFAULT_ENTRANCE_DURATION = 30;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;
// Add other defaults as needed
```

## 3. Define Props Interface

```typescript
export interface MyNewSceneProps {
    id?: string;
    // Required props
    text: string;
    // Optional props with defaults
    variant?: TypographyVariant;
    animation?: EntranceAnimation;
    startAt?: number;
    className?: string;
    style?: React.CSSProperties;
}
```

**Rules:**
- `animation` should always be **optional** with a default
- `startAt` should always be **optional**, defaulting to `0`
- Use `TypographyVariant` for text styling variants
- Use `EntranceAnimation` for entrance animation types

## 4. Implement the Component

```typescript
export const MyNewScene: React.FC<MyNewSceneProps> = ({
    id,
    text,
    variant,
    animation,
    startAt,
    className,
    style,
}) => {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    // Apply defaults using constants
    const actualVariant = variant ?? DEFAULT_VARIANT;
    const actualAnimation = animation ?? DEFAULT_ANIMATION;
    const actualStartAt = startAt ?? 0;

    // Use interpolateWithEasing for smooth animations
    const progress = interpolateWithEasing(
        frame,
        [actualStartAt, actualStartAt + DEFAULT_ENTRANCE_DURATION],
        [0, 1],
        styleConfig.motion.entrance  // Use easing from style config
    );

    // Render component...
};
```

**Animation Guidelines:**
- Always use `interpolateWithEasing()` instead of raw `interpolate()` for consistent easing
- Get easing from `styleConfig.motion.entrance`
- Use `getEntranceTransform()` helper for entrance animations

## 5. Create Zod Schema

Define the schema with defaults matching your constants:

```typescript
export const MyNewSceneSchema = z.object({
    // Required props
    text: z.string().min(1, "text is required"),
    
    // Optional props with defaults
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    animation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    
    // Optional props without defaults
    className: z.string().optional(),
    style: z.any().optional(),
});
```

**Schema Rules:**
- Use `.default(CONSTANT)` for all props that have defaults
- Use `.optional()` after `.default()` for optional props
- Add validation messages for constraints (e.g., `.min(0, "message")`)

## 6. Implement Duration Calculator

The duration calculator validates props and returns the total animation duration:

```typescript
export function calculateMyNewSceneDuration(props: MyNewSceneProps): DurationResult {
    // 1. Validate props with schema
    const validation = MyNewSceneSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;
    
    // 2. Add business logic validation if needed
    if (someCondition) {
        return {
            success: false,
            error: "descriptive error message",
            field: "fieldName",
        };
    }

    // 3. Calculate total duration
    const entranceDuration = validated.animationDelay ?? DEFAULT_ENTRANCE_DURATION;
    const contentDuration = /* calculate based on content */;
    
    return {
        success: true,
        duration: Math.ceil(entranceDuration + contentDuration),
    };
}
```

**DurationResult Type:**
```typescript
type DurationResult = 
    | { success: true; duration: number }
    | { success: false; error: string; field?: string };
```

## 7. Create Component Descriptor

```typescript
export const MyNewSceneDescriptor: ComponentRegistration = {
    name: 'MyNewScene',
    type: 'scene',
    fullSchema: MyNewSceneSchema,
    description: 'Brief description of what this scene does. Use for X, Y, Z. Required props: text="Example text".',
    calculateDuration: calculateMyNewSceneDuration,
};
```

**Description Guidelines:**
- Keep it concise but informative
- Mention use cases
- Include example of required props

## 8. Register in Component Registry

Add to `src/registry/scenes.ts`:

```typescript
import { MyNewSceneDescriptor } from "../components/scenes/text/MyNewScene";

export const SCENE_COMPONENTS: ComponentRegistration[] = [
    // ... existing components
    MyNewSceneDescriptor,
];
```

## 9. Export from Index

Add to the appropriate index file:

```typescript
// src/components/scenes/text/index.ts or assets/index.ts
export { MyNewScene, MyNewSceneDescriptor } from './MyNewScene';
```

## 10. Write Tests

Create test file in `src/__tests__/MyNewScene.test.ts`:

```typescript
import { calculateMyNewSceneDuration } from '../components/scenes/text/MyNewScene';

describe('MyNewScene Duration Calculation', () => {
    it('should calculate duration with required props', () => {
        const result = calculateMyNewSceneDuration({
            text: 'Test text',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.duration).toBe(/* expected duration */);
        }
    });

    it('should return error for invalid props', () => {
        const result = calculateMyNewSceneDuration({
            text: '',  // Invalid: empty text
        });
        expect(result.success).toBe(false);
    });
});
```

## Checklist

- [ ] Constants defined with `as const`
- [ ] Props interface with optional `animation` and `startAt`
- [ ] Component uses `interpolateWithEasing()`
- [ ] Zod schema with `.default()` matching constants
- [ ] Duration calculator returns `DurationResult`
- [ ] Descriptor with description and example
- [ ] Registered in `scenes.ts`
- [ ] Exported from index
- [ ] Tests written for duration calculation
