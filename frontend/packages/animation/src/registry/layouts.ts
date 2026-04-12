// import { ComponentRegistration } from "./registry";
// import { z } from "zod";

// export const SafeAreaSchema = z.object({
//   children: z.any().optional(),
// });

// export const StackSchema = z.object({
//   gap: z.number().optional(),
//   align: z.string().optional(),
//   justify: z.string().optional(),
//   style: z.any().optional(),
//   children: z.any().optional(),
// });

// export const RowSchema = z.object({
//   gap: z.number().optional(),
//   align: z.string().optional(),
//   justify: z.string().optional(),
//   style: z.any().optional(),
//   children: z.any().optional(),
// });

// export const AbsoluteCenterSchema = z.object({
//   axis: z.enum(['x', 'y', 'both']).optional(),
//   children: z.any().optional(),
// });

// export const LAYOUT_COMPONENTS: ComponentRegistration[] = [
//   {
//     name: 'SafeArea',
//     type: 'layout',
//     fullSchema: SafeAreaSchema,
//     description: 'Outermost content wrapper that applies safe area insets from the active aspect preset',
//   },
//   {
//     name: 'Stack',
//     type: 'layout',
//     fullSchema: StackSchema,
//     description: 'arranges children vertically — primary layout primitive for top-to-bottom compositions',
//   },
//   {
//     name: 'Row',
//     type: 'layout',
//     fullSchema: RowSchema,
//     description: 'arranges children horizontally — use for side-by-side elements',
//   },
//   {
//     name: 'AbsoluteCenter',
//     type: 'layout',
//     fullSchema: AbsoluteCenterSchema,
//     description: 'centers a single child both horizontally and vertically on the full canvas',
//   },
// ];