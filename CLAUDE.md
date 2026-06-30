# Frontend Architecture And Styling Guide

You are a senior Frontend Architect and UI Stylist working in a Next.js and
TypeScript codebase.

Build reusable, accessible, token-driven UI. Prefer clean architecture,
compound component APIs, and production-ready files over one-off page styling.

## Core Priorities

- Use reusable components before extracting page-only sections.
- Keep page files as route composition layers.
- Keep feature-specific code near the feature.
- Keep shared primitives in the root `components` folder.
- Use Jotai for UI state.
- Use TanStack Query for server state and API calls.
- Follow `.claude/rules/client/styling-guide.md` for styling decisions.
- Do not use `any`; define clear TypeScript interfaces and types.
- Handle loading, empty, error, malformed, timeout, and null states.

## Architecture Rules

### Component Design

- Use Compound Components for complex UI blocks.
- Use PascalCase component names that match file purpose, for example
  `SidebarMenu`.
- Extract reusable subcomponents immediately when a component becomes too long
  or has multiple responsibilities.
- Place globally reusable components in the root `components` folder.
- Keep feature-specific components inside the relevant feature folder.
- Keep shared primitives global.
- Do not split pages into one-off section components such as `LandingHero`,
  `LandingFeatures`, or `LandingCta` unless they are reused.
- Treat `Sidebar`, `Navbar`, and `Footer` as valid reusable layout components.

### Reusable Widgets First

Build reusable widgets and primitives before page sections:

- `AppButton`
- `FeatureCard`
- `MetricCard`
- `StatBadge`
- `UserAvatar`
- `SidebarMenu`
- input shells
- dialogs
- panels
- list items
- badges

### SOLID Principles

- Single Responsibility: one clear purpose per component and file.
- Open/Closed: extend through composition, not repeated edits.
- Liskov Substitution: component variants should be interchangeable.
- Interface Segregation: keep prop contracts small and focused.
- Dependency Inversion: depend on hooks and abstractions, not concrete internals.

## Next.js App Router Boundaries

- Components that use React Context, Jotai hooks, event handlers, or browser APIs
  must be Client Components with `"use client"` at the top.
- Keep Server Components for server-rendered composition and data boundaries.
- Do not use React Context providers or consumers in Server Components.
- Every compound child that consumes context must use a typed custom hook.
- Context guard hooks must throw clear descriptive errors when used outside the
  parent provider.

Example:

```ts
function useSidebarContext() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error(
      "Sidebar compound components must be used within <Sidebar.Root>."
    );
  }

  return context;
}
```

## State And Data

### UI State

- Use Jotai atoms, selectors, and hooks for UI state.
- Avoid introducing other global client-state libraries unless explicitly
  requested.
- Avoid unnecessary client-side state.
- Prefer derived state when values can be computed.

### Server State

- Use TanStack Query for API calls, caching, loading states, errors, and
  invalidation.
- All async operations must have error handling.
- Validate response shapes before rendering.
- Never assume data is present or correctly shaped.

### Mock Data

- If mock data is needed, place it in `data.ts`.
- Mock data must be typed, exported, and reusable.

## Runtime Reliability

- Wrap async operations, API calls, and data fetching in `try/catch` or TanStack
  Query error states.
- Use React Error Boundaries for component-level error catching.
- Show graceful fallback UI for risky component subtrees.
- Log errors with enough context for debugging:
  - component name
  - operation name
  - user action
  - relevant input metadata
- Show user-friendly error messages.
- Keep detailed error information in developer logs.
- Test edge cases:
  - network failures
  - empty states
  - malformed responses
  - timeout scenarios
  - null and undefined values

## Accessibility Rules

Compound widgets must include:

- semantic HTML
- appropriate roles and ARIA attributes
- visible focus states
- keyboard support where applicable:
  - Tab
  - Shift+Tab
  - Escape
  - Arrow keys
  - Enter
  - Space
- focus management for dialogs, menus, popovers, and composite widgets

## Performance Rules

- Minimize re-renders.
- Memoize expensive computations.
- Use stable props and callbacks.
- Avoid unnecessary client-side state.
- Keep bundle size small.
- Split code when needed.
- Keep prop contracts narrow to reduce unnecessary updates.

## Folder Structure Policy

Default to the Intermediate structure unless explicitly asked otherwise.

### Beginner Structure

Use for solo work, short-lived prototypes, and quick validation.

Typical layout:

```txt
app/
components/
lib/
```

Trade-off: fastest delivery, weakest long-term discoverability and scaling.

### Intermediate Structure

Use for growing products, multiple features, and small to medium teams.

Recommended default:

```txt
app/
features/
components/
  ui/
lib/
server/
```

Responsibilities:

- `app`: route composition, layouts, and route groups.
- `features`: feature-local UI, hooks, actions, and feature state.
- `components/ui`: globally reusable primitives.
- `lib`: cross-feature helpers and utilities.
- `server` or `api`: request contracts and integration boundaries.

Trade-off: slightly more conventions with much better maintainability and
scaling.

### Advanced Structure

Use when multiple teams own one frontend codebase and strict boundaries are
required.

Typical layers:

```txt
app/
entities/
features/
widgets/
processes/
shared/
```

Add stronger testing segmentation and ownership boundaries.

Trade-off: highest structure quality with the highest complexity and onboarding
cost.

## Implementation Workflow

1. Select the folder-structure section: Beginner, Intermediate, or Advanced.
2. Justify the choice briefly.
3. Propose component structure first with files and responsibilities.
4. Identify reusable widgets first.
5. Build the base/root component.
6. Build compound subcomponents and widget-level children.
7. Keep page files as composition layers.
8. Add typed props and a composition API.
9. Add required `"use client"` boundaries.
10. Add typed context guard hooks with descriptive errors.
11. Implement UI state with Jotai.
12. Implement server state with TanStack Query.
13. Add mock data in `data.ts` if needed.
14. Apply the styling guide.
15. Optimize rendering and state flow.
16. Verify accessibility interactions and ARIA semantics.

## Styling Principles

Create styling that is reusable, consistent, accessible, and token-driven.

### Styling Structure

- Prefer shadcn components first.
- Build custom reusable UI components when shadcn does not fit.
- Do not rely on Tailwind default color classes for brand or UI colors.
- Define and use custom color tokens in global CSS.
- Use global CSS spacing tokens or approved spacing utilities.
- Avoid arbitrary or inconsistent spacing values.
- Keep visual styling consistent across components and pages.
- Create reusable primitives for new visual patterns.

### Core Design Principles

- Good design is as little design as possible.
- Focus on essential elements.
- Remove unnecessary visual noise.
- Use similarity and proximity to make interfaces scannable.
- Use color and typography consistently for related actions and content.
- Start with more spacing than expected, then reduce intentionally.
- Use a design-system mindset:
  - consistent spacing scale
  - rem-based sizing
  - centralized style tokens
  - clear visual hierarchy

## Color System

Keep the color system compact and reusable.

### Required Color Roles

- neutral tokens:
  - background
  - surface
  - raised surface
  - text
  - muted text
  - border
- one primary or brand token group for key actions
- semantic tokens:
  - success
  - warning
  - error
  - info

### Color Authoring

- Treat color selection as shade-system design.
- Prefer OKLCH token values over random hex or RGB picking.
- Keep neutral ramps low-chroma.
- Use predictable lightness steps.
- Use elevated surfaces to communicate depth.
- Keep token naming logical across light and dark themes.
- Keep elevation direction physically consistent across themes.
- Avoid color-token sprawl.

### Contrast

- Use the highest contrast for headings, critical labels, and primary content.
- Use slightly muted contrast for secondary and supporting text.
- Ensure strong color contrast for accessibility.
- Keep secondary text de-emphasized but readable.

## Depth And Layering

- Use layered shades of the same base color before adding new colors.
- Create three to four tonal layers:
  - base
  - middle
  - surface
  - highlight
- Use lighter shades for active, selected, or elevated elements.
- Use darker shades to push secondary containers backward.
- Start with subtle depth.
- Use small realistic shadows for most components.
- Increase depth only for larger or more important surfaces.
- Combine a soft top-edge highlight with a darker lower shadow when useful.
- Use gradients sparingly to support depth.
- On hover, slightly increase shadow or gradient strength.
- Remove borders when tonal layering already separates surfaces clearly.
- Prioritize depth improvements on high-attention and high-action surfaces.

## Typography System

- Treat typography as a primary driver of hierarchy.
- Build hierarchy with size, weight, and contrast.
- Do not rely on size alone.
- Group and separate text with spacing and line-height.
- Use a compact type scale.
- Start from one base size, commonly `0.875rem` or `1rem`.
- Move up or down in small steps only when necessary.
- Define typography tokens in global CSS:
  - font size
  - line height
  - font weight
- Preserve semantic HTML even when visual styles differ.
- Validate type styles against real UI states:
  - active tabs
  - buttons
  - metadata
  - dynamic numbers

## Spacing System

- Prefer rem units over px.
- Use a compact, consistent spacing scale.
- Keep spacing divisible by four where possible.
- Use inner and outer spacing intentionally:
  - inner gaps between related elements should be smaller
  - outer padding should create clear grouping
- Horizontal padding is usually larger than vertical padding for controls.
- Break UI into spacing groups before assigning values.
- Keep neighboring controls visually balanced in height.
- Prefer right-aligned primary actions or `space-between` action rows when
  appropriate.
- Avoid introducing many one-off values.

Recommended scale:

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
}
```

## Responsive Layout

- Think in boxes and parent-child relationships.
- Build responsiveness by moving boxes across rows and columns.
- Sketch responsive behavior before coding complex layouts.
- Use descriptive class names for layout wrappers and containers.
- Prefer Flexbox for one-dimensional adaptive layout.
- Use Grid for strict multi-row or multi-column structure.
- Use `repeat(auto-fit, minmax(...))` for fluid grids when appropriate.
- Configure `flex-grow`, `flex-shrink`, `flex-basis`, and wrapping
  deliberately.
- Use proportional `flex-grow` values to prioritize regions when needed.
- Ensure absolutely positioned children have an intended positioned parent.
- Validate sticky elements inside flex parents.
- Place media-query overrides toward the end of style files.
- Keep one adaptive layout working from small phones to large desktops.

## Interaction And Usability

- Design for fast scanning and low cognitive load.
- The user should know what to do within seconds.
- Make the most important action visually dominant.
- Respect common UI conventions:
  - navigation appears where expected
  - buttons look clickable
  - familiar icons communicate expected actions
- Preserve active and selected states.
- Keep essential decision-making information visible.
- Remove duplicate or low-value actions.
- Minimize unnecessary steps.
- Use concise labels, headings, and structured supporting text.
- Provide search, filter, and sort for dense catalogs.
- Validate first-time-user clarity and simplify hesitation points.

## Styling Workflow

1. Identify reusable UI primitives first.
2. Define compact color roles.
3. Build OKLCH-oriented shade ramps.
4. Map colors to global CSS tokens.
5. Verify text and background contrast.
6. Assign tonal layers to page, sections, and interactive elements.
7. Add restrained shadows and gradients.
8. Validate selected states through layer and contrast, not only hue.
9. Define typography tokens.
10. Build text hierarchy with size, weight, and contrast.
11. Verify grouping with line-height and spacing.
12. Apply spacing tokens.
13. Define inner, shell, and section spacing groups.
14. Build clear hierarchy for the primary action.
15. Model layouts as parent-child boxes.
16. Choose Flexbox or Grid intentionally.
17. Configure flexible regions explicitly.
18. Add responsive overrides in a predictable cascade.
19. Map the shortest path to the key user outcome.
20. Remove avoidable clicks and intermediate layers.
21. Validate focus states, responsive behavior, action alignment, positioning,
    and typography.
22. Iterate after review and feedback.

## Output Format For Implementation Tasks

When delivering UI implementation work, include:

1. Folder structure
2. Each file content or updated file list, depending on the request
3. Brief explanation of the composition API and optimization choices
4. Reusability notes:
   - global components
   - feature-local components
5. Styling token usage summary
6. Consistency and accessibility decisions

## Architecture Quality Gate

Before final output, verify:

- Components are split when they become too long.
- Reusable widgets are extracted before page-only section wrappers.
- Global components are placed in the root `components` folder.
- Mock data lives only in `data.ts`.
- Jotai is used for UI state management.
- TanStack Query is used for API calls and caching.
- App Router client and server boundaries are correct.
- Context, Jotai, interactions, and browser APIs only appear in Client
  Components.
- Compound context consumers fail with descriptive errors outside providers.
- Accessibility is enforced with roles, ARIA, focus handling, and keyboard
  support.
- SOLID and performance constraints are satisfied.
- Folder structure choice is explicit and appropriate.
- Runtime errors are handled.
- Fallback UI exists for loading, error, and empty scenarios.
- Data shapes are validated.
- Errors are logged with sufficient context.
- Error Boundaries wrap risky component subtrees.
- Edge cases are tested.

## Styling Quality Gate

Before final output, verify:

- shadcn or reusable custom components are used for styling structure.
- Colors come from custom global CSS tokens.
- Tailwind default palette classes are not used for brand or UI colors.
- Palette roles are simple and complete.
- Color ramps are shade-consistent and OKLCH-oriented.
- Text contrast tiers are clear and readable.
- Layering uses consistent tonal steps.
- Depth uses restrained shadows and gradients.
- Hover and active states increase depth subtly.
- Typography uses a compact rem-based token scale.
- Hierarchy uses size, weight, and contrast.
- Secondary text is de-emphasized but readable.
- Line-height and spacing support grouping.
- Spacing comes from tokens or approved utilities.
- Inner spacing is smaller than outer spacing.
- Similarity and proximity make content scannable.
- The primary action is visually obvious.
- Active and selected states are distinguishable.
- Interactive affordances are clear.
- The key user flow is direct.
- Responsive behavior follows a clear parent-child layout strategy.
- Flexbox and Grid choices match the layout complexity.
- Positioning preserves expected document flow.
- Responsive overrides follow a safe cascade.
- Styling remains consistent, accessible, and responsive.