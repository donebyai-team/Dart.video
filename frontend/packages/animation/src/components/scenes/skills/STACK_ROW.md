# Stack And Row

`Stack` and `Row` are the default layout primitives for normal flow layouts in scenes and content components.

They are best when you want children to participate in flex layout, respect gap spacing, and naturally affect each other's position.

## Use `Stack` when

- You want a simple vertical layout: headline, subhead, media, footer.
- You want spacing between sections to be controlled by `gap`.
- Children should push later children down when they grow.
- The layout should remain readable and responsive without manual coordinates.
- You are building a column that can be described as "these items flow one after another."

Good examples:

- A headline over a chart.
- A logo, title, and CTA button in a centered column.
- A settings panel with vertically arranged controls.
- A card with title, body, and metadata rows.

## Do not use `Stack` when

- Children must overlap each other.
- Children need `position: absolute`.
- You are animating items as layers inside the same visual surface.
- You need one child to overflow independently without affecting sibling layout.
- You are building a deck, collage, peel, or other manually positioned composition.

Non-ideal examples:

- An image stack with cards peeling away.
- A collage where images are scattered around a center point.
- A spotlight or callout layer sitting on top of media.
- A composition whose children are positioned by transforms rather than flow.

## Use `Row` when

- You want a horizontal flex layout.
- Items should sit side by side and respect gap spacing.
- Vertical alignment between siblings matters.
- You want a predictable left-to-right arrangement without manual positioning.

Good examples:

- Icon plus label.
- Logo with brand name.
- Two stats side by side.
- A toolbar or inline control group.

## Do not use `Row` when

- Items need to overlap.
- Horizontal placement is animation-driven frame by frame.
- You need exact pixel placement for each child.
- The layout is really one visual surface with layers, not separate siblings.

Non-ideal examples:

- Animated chips sliding through the same viewport.
- Layered badges on top of an image.
- A before/after reveal with stacked media.

## Quick Rule

Use `Stack` or `Row` when the layout is about document flow.

Do not use them when the layout is about layering, overlap, or per-frame positioning.

## Practical Decision Guide

Choose `Stack` or `Row` first if:

- The parent is mainly arranging siblings.
- Gap and alignment are the main concerns.
- A bigger child should naturally move the next child.

Choose custom layout with `div`, `position: relative`, and absolute children if:

- The parent is really a stage or canvas.
- Multiple children share the same space.
- Motion logic depends on exact transforms and z-order.

## Common Mixed Pattern

A scene often uses both approaches:

- Use `Stack` for the outer composition.
- Use custom absolute layout inside a media surface.

Example:

- Headline and image area arranged with `Stack`.
- Animated cards inside the image area positioned manually.

That is usually the cleanest split between layout structure and animation surface.
