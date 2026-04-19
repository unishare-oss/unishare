---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces for the Unishare platform. Generates creative, polished components that respect the existing design system while pushing aesthetic quality.
---

This skill guides creation of distinctive, production-grade frontend interfaces within the **Unishare design system**. Implement real working code with exceptional attention to detail while staying fully compatible with the existing theme architecture.

The user provides frontend requirements: a component, page, or interface to build for the Unishare platform.

## Design System Constraints (NON-NEGOTIABLE)

These rules override all generic frontend-design guidance below:

### Typography

- **Primary font**: `Space Grotesk` (already loaded globally via `--font-sans`)
- **Monospace font**: `Fira Code` (already loaded globally via `--font-mono`)
- Do NOT import or use any other Google Fonts or custom fonts
- Use `font-sans` and `font-mono` Tailwind utilities — never hardcode font families

### Colors

- **Always** use CSS variables via Tailwind utilities: `bg-background`, `text-foreground`, `text-primary`, `bg-card`, `border-border`, `text-muted-foreground`, etc.
- **Never** hardcode hex values — they will break all 12 themes
- Brand accent variables available across all themes: `bg-amber`, `hover:bg-amber-hover`, `bg-amber-subtle`, `text-amber`
- Semantic colors: `text-success`, `text-info`, `text-destructive`
- Surface variants: `bg-card`, `bg-muted`, `bg-accent`, `bg-secondary`
- Sidebar-specific: `bg-sidebar`, `text-sidebar-foreground`, etc.

### Tailwind & Styling

- Tailwind CSS 4 — use utility classes, not arbitrary values where avoidable
- Border radius base is `6px` (`rounded-md` = `--radius`); use `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` for scale
- Animations: `tw-animate-css` is available; custom keyframes exist in `globals.css` (`animate-shake`, `reaction-active`)
- Prefer CSS-only animations; if using a JS animation library, check it's already in the project before importing

### Component Patterns

- Use shadcn/ui primitives where they exist (`Button`, `Card`, `Input`, `Badge`, `Popover`, etc.)
- New components go in `src/components/` (shared) or `src/features/<feature>/` (feature-scoped)
- No direct Prisma imports in frontend code
- Keep server/client boundary clean — mark `'use client'` only where interactivity requires it

---

## Design Thinking (within the system)

Before coding, understand the context and commit to a clear aesthetic direction — the constraint is the palette and fonts, not the creativity:

- **Purpose**: What problem does this component/page solve? Who uses it?
- **Tone**: Even within a fixed design system, you can be: brutally minimal, densely information-rich, editorial/magazine-like, playful with motion, spatially bold with asymmetry and overlap, etc.
- **Differentiation**: What makes this component memorable? Unexpected layout, generous negative space, a well-timed micro-interaction, a surprising use of `bg-amber-subtle` as a highlight?

**The constraint is the color system and typography — not the layout, spacing, composition, or motion.**

## Aesthetic Guidelines (Unishare-adapted)

- **Composition**: Unexpected layouts, asymmetry, overlap, diagonal flow, grid-breaking elements — all valid. The design system doesn't dictate layout.
- **Motion**: Prioritize CSS-only animations. Use `animation-delay` for staggered reveals. Hover states that surprise. Use existing keyframes from `globals.css` before writing new ones.
- **Depth & Atmosphere**: Use `bg-card`, `bg-muted`, `bg-accent`, `shadow`, and `border-border` layering to create depth. Subtle gradients using `from-background to-card` are fine — keep colors in-system.
- **Density**: Choose deliberately — generous whitespace for focus-heavy UIs, controlled density for data-heavy ones. Both work; be intentional.
- **Micro-details**: Ring focus states (`ring-ring`), smooth transitions, border highlights, subtle hover lifts — these are where quality lives.

## The 12 Themes

Your output must look great across all of them. Test mentally against at minimum:

- `unishare` (light, amber) — the default
- `catppuccin-mocha` (dark, peach)
- `tokyo-night` (dark, blue)
- `sakura` (light, rose)

Since you're using CSS variables throughout, this is automatic — but avoid hacks like `dark:` variants that assume a specific dark theme class (the app uses theme classes, not `dark` class).
