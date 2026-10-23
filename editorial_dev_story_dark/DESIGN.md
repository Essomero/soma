---
name: Editorial Dev-Story Dark
colors:
  surface: '#151b23'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#c4c5d7'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#8e90a0'
  outline-variant: '#444654'
  surface-tint: '#b8c3ff'
  primary: '#b8c3ff'
  on-primary: '#002388'
  primary-container: '#4969ed'
  on-primary-container: '#fffcff'
  inverse-primary: '#2e51d5'
  secondary: '#47e175'
  on-secondary: '#003915'
  secondary-container: '#00bc55'
  on-secondary-container: '#00431a'
  tertiary: '#d3bbff'
  on-tertiary: '#3f008d'
  tertiary-container: '#8856e5'
  on-tertiary-container: '#fffbff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001355'
  on-primary-fixed-variant: '#0035bd'
  secondary-fixed: '#68ff8e'
  secondary-fixed-dim: '#47e175'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#ebddff'
  tertiary-fixed-dim: '#d3bbff'
  on-tertiary-fixed: '#250059'
  on-tertiary-fixed-variant: '#581cb4'
  background: '#10141a'
  on-background: '#f0f6fc'
  surface-variant: '#31353c'
  surface-overlay: '#161b22'
  on-surface-muted: '#9198a1'
  accent-orange: '#f0883e'
  accent-blue-neon: '#218bff'
  border-default: '#3d444d'
typography:
  display-lg:
    fontFamily: sora
    fontSize: 130px
    fontWeight: '800'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: sora
    fontSize: 60px
    fontWeight: '800'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  headline-md:
    fontFamily: sora
    fontSize: 46px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  article-title:
    fontFamily: sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.025em
  body-base:
    fontFamily: dmSans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: sora
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: 0.05em
  metadata-tag:
    fontFamily: sora
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 1px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  giant: 64px
  gutter: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is a premium **Dark-Mode Editorial Showcase**. It is built to balance technical utility with the high-end aesthetic of a print magazine. The personality is professional, community-focused, and tech-forward, prioritizing storytelling through deep-contrast surfaces and cinematic typography.

The visual style is **Minimalist Editorial with High-Contrast Accents**. It utilizes expansive whitespace (or "darkspace"), fluid typography that scales dramatically across devices, and a strict content hierarchy. Visual interest is driven by vibrant, high-saturation illustrations and gradients rather than skeuomorphic depth. The "Double-Slash" (`//`) is a signature structural motif used to separate metadata from primary titles, reinforcing the developer-centric heritage within a sophisticated layout.

## Colors

The palette is optimized for long-form reading in low-light environments. The foundation is **Deep Space Black**, which provides an absolute canvas for content. Surfaces and cards use a slightly elevated **Slate Surface** to create subtle structural depth.

**Accent Colors:**
- **Cobalt Power Blue** and **Vibrant Lime Green** serve as the primary interactive and energetic pair, often appearing as a 135-degree linear gradient.
- **Accent Purple** and **Orange** are reserved for categorical signaling, such as identifying specific story types (Guides vs. Podcasts).
- **On-Background** text is a crisp off-white to maintain high legibility without the eye-strain of pure `#FFFFFF` against black.

## Typography

The typography system uses a pairing of geometric, tech-forward sans-serifs to create an authoritative yet approachable feel.

- **Headlines:** Use **Sora** for its wide stance and modern geometric construction. Tight tracking (`-0.04em`) is essential for large display sizes to ensure the characters feel locked and cinematic.
- **Body:** Use **DM Sans** for its high legibility and neutral character, ensuring that long-form articles remain breathable.
- **Stylistic Notes:** Metadata and labels should always be uppercase with increased letter-spacing to distinguish them from content. The "Double-Slash" separator used in titles should match the color of the adjacent metadata tag.

## Layout & Spacing

This design system employs an **Editorial Fluid Grid**. The layout philosophy prioritizes "breathing room" to mimic the feel of a physical magazine. 

- **Grid:** A 12-column responsive grid with a maximum content width of 1540px. 
- **Asymmetry:** Content is often arranged asymmetrically—large featured stories occupy the majority of the horizontal space, while secondary links or metadata are tucked into narrower adjacent columns.
- **Vertical Rhythm:** A strict 8px-based vertical rhythm is used. Section dividers consist of 1px hairline borders in `border-default` often accompanied by a small 4px high thick "accent bar" in black or a brand gradient to anchor new content blocks.
- **Adaptation:** On mobile, all asymmetric layouts collapse into a single-column stack, with margins decreasing to 16px.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional drop shadows.

- **Background:** The base layer is `#0d1117`.
- **Containers:** Cards and section backgrounds use `#151b23`.
- **Outlines:** All interactive elements and cards use a 1px hairline border (`#3d444d`). On hover, these borders may transition to a higher opacity white or a brand gradient.
- **Depth:** Elements do not "float" with shadows; they sit flat on the surface. Depth is perceived through the contrast between the black background and the slightly lighter slate cards.

## Shapes

The shape language is **Soft and Structural**. It avoids overly rounded "pill" shapes for primary containers to maintain a professional, organized appearance.

- **Primary Corners:** A base radius of `4px` is used for buttons and input fields to keep them feeling tactile yet sharp.
- **Content Cards:** A larger `8px` (`rounded-lg`) radius is applied to article cards and hero images to subtly soften the editorial layout.
- **Avatar/Icons:** Only user avatars and specific status indicators use `full` (pill) rounding.

## Components

- **Buttons:** Sharp, modular rectangles with a 4px radius. Use `#151b23` backgrounds with a white hairline border. Typography is `metadata-tag` (uppercase, bold).
- **Editorial Cards:** These are the core of the system. They feature full-bleed imagery (16:9), followed by a `metadata-tag` using the `//` separator, and an `article-title`. The card itself has a subtle `#151b23` background and `#3d444d` border.
- **Input Fields:** Search inputs should be transparent with a semi-transparent white border. On focus, the border becomes solid white or `accent-blue-neon`.
- **Navigation:** A sticky top-bar with a backdrop-blur effect. Active links are indicated by a 2px bottom border featuring the primary-to-secondary gradient.
- **Chips/Tags:** Used for "Topics." These are small, `#151b23` capsules with `label-caps` typography and no border, using subtle background shifts on hover.
- **Dividers:** Use 1px hairline lines in `border-default`. For major section breaks, add a left-aligned 40px wide, 4px tall solid black or gradient bar above the section heading.