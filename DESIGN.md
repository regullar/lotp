---
name: LumenLink
description: A plain, trustworthy optical-transfer utility that makes the local screen-to-camera path visible.
colors:
  proof-ink: "#0b1512"
  work-panel: "#11201c"
  neutral-800: "#24342f"
  neutral-700: "#3b4d47"
  neutral-500: "#75857f"
  neutral-400: "#9ca9a5"
  neutral-300: "#c5ceca"
  neutral-200: "#dde3e0"
  neutral-100: "#f2f5f3"
  shell-canvas: "#f4f6f5"
  white-shell: "#ffffff"
  body-ink: "#10201c"
  mint-signal: "#91ded4"
  mint-light: "#b6eee7"
  mint-soft: "#cef6f1"
  cobalt-primary: "#3e7bfa"
  cobalt-light: "#6b9bff"
  cobalt-hover: "#2e69e8"
  brand-teal: "#0d8f82"
  ink-glass: "rgba(10, 29, 24, 0.7)"
typography:
  display:
    fontFamily: "Onest, sans-serif"
    fontSize: "clamp(52px, 4.55vw, 68px)"
    fontWeight: 780
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Onest, sans-serif"
    fontSize: "24px"
    fontWeight: 740
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Onest, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Onest, sans-serif"
    fontSize: "12px"
    fontWeight: 680
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  compact: "8px"
  nav: "10px"
  control: "12px"
  functional: "16px"
  mobile-window: "20px"
  proof-window: "28px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt-primary}"
    textColor: "{colors.white-shell}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-hover}"
    textColor: "{colors.white-shell}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.ink-glass}"
    textColor: "{colors.mint-soft}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "52px"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-700}"
    typography: "{typography.body}"
    rounded: "{rounded.nav}"
    padding: "10px 12px"
  field-dark:
    backgroundColor: "{colors.proof-ink}"
    textColor: "{colors.white-shell}"
    typography: "{typography.label}"
    rounded: "{rounded.compact}"
    padding: "8px 12px"
  working-container:
    backgroundColor: "{colors.work-panel}"
    textColor: "{colors.neutral-100}"
    rounded: "{rounded.functional}"
    padding: "24px"
---

# Design System: LumenLink

## Overview

**Creative North Star: "The Optical Window"**

LumenLink is a polished privacy utility played with plain confidence. A quiet white shell holds a single deep-ink proof surface where the product's physical truth becomes visible: an authored device scene and mint optical path show a file crossing directly from screen to camera, while cobalt identifies the primary action.

The system is spacious and immediately operable rather than dashboard-dense. Oversized language explains the mechanism before technical detail, literal Lucide action icons keep controls familiar, and working views return to restrained dark panels with hairline structure. The result feels trustworthy because it shows what happens instead of decorating privacy as an abstract claim.

**Key Characteristics:**

- White utility shell around deep-ink proof and working surfaces.
- Mint optical signal paired with one decisive cobalt action.
- Onest variable typography from 400 through 800.
- Controlled functional rounding and one dominant proof-window silhouette.
- Authored optical imagery, literal action icons, and hairline separators.
- Responsive stacking with motion reduced to near-static when requested.

## Colors

The palette separates action, signal, and structure: cobalt acts, mint proves the local optical path, and ink-to-paper neutrals carry the interface.

### Primary

- **Cobalt Action** (`cobalt-primary`): reserved for the main action, keyboard focus, and the clearest active affordance; its darker hover value is `cobalt-hover`.

### Secondary

- **Mint Signal** (`mint-signal`): marks the optical beam, local-only proof, positive transfer cues, and selected states. Lighter mint tokens support hover and quiet signal surfaces.
- **Brand Teal** (`brand-teal`): gives the mark and low-emphasis positive status a darker, accessible voice on the white shell.

### Neutral

- **Proof Ink** (`proof-ink`): the dominant hero and deepest working surface.
- **Work Panel** (`work-panel`): a slightly lifted dark operational layer.
- **White Shell** (`white-shell`) and **Shell Canvas** (`shell-canvas`): the navigation, floating step strip, and global page ground.
- **Body Ink** (`body-ink`): primary text on light surfaces.
- **Neutral Scale** (`neutral-800` through `neutral-100`): borders, muted copy, separators, and tonal working-state layers.

### Named Rules

**The Signal Discipline Rule.** Mint proves transfer or local state; cobalt identifies the primary action. Neither color becomes decoration.

**The White-Shell Rule.** The global shell stays quiet and pale so the deep proof window reads as the product's physical stage.

## Typography

**Display Font:** Onest (with sans-serif fallback)  
**Body Font:** Onest (with sans-serif fallback)

**Character:** One variable family makes the system contemporary, direct, and readable in both English and Russian. Personality comes from confident weight, compact display spacing, and a clear size jump rather than a decorative pairing.

### Hierarchy

- **Display** (`display`): the first-viewport promise, balanced to a short measure and set with a compact line height.
- **Headline** (`headline`): section introductions such as browser capability status.
- **Body** (`body`): operational copy and descriptive text; hero body copy grows to 17px while keeping the same family and open rhythm.
- **Label** (`label`): status, metadata, navigation support, and compact control language.

### Named Rules

**The Oversized Proof Rule.** Large type states the direct-transfer promise before protocol detail; UI labels remain compact and practical.

## Layout

The global shell uses a centered fluid container capped at 1440px with 20px side insets on desktop. Home begins with a single dominant proof window and an overlapping three-column step strip, followed by a two-part capability region. Operational pages use a narrower 1152px container.

At 1080px, navigation moves to its own horizontally scrollable row and the proof composition gives the authored device scene more vertical room. At 760px, the hero becomes a stacked 20px-radius composition: copy leads, the raster occupies the middle, actions flex to full available width, and the three steps become one vertical strip. Capability rows, operational content, and the footer also collapse to single-column flow.

Spacing follows a compact 8/12/16/24/32px rhythm, with larger responsive padding reserved for the hero's statement and the white space separating major regions.

## Elevation & Depth

Depth is rare and structural. The dominant proof window carries one soft downward ambient shadow (`0 22px 55px rgba(11, 21, 18, 0.18)`), and its overlapping step strip uses a tighter anchoring shadow (`0 14px 30px rgba(3, 12, 9, 0.26)`). Working panels stay flat and rely on tonal contrast plus hairline borders.

### Shadow Vocabulary

- **Ambient Proof:** the one soft shadow behind the dominant optical window.
- **Anchored Strip:** the compact shadow that clarifies the step strip's overlap with the proof window.

### Named Rules

**The Border-Led Work Rule.** Operational panels and rows use tone and hairline separators; shadows are reserved for the home proof composition.

## Shapes

The dominant desktop proof window uses the system's largest radius (`proof-window`) and tightens to `mobile-window` on small screens. Functional controls and containers use `control` through `functional`; compact rows and navigation use the smaller `compact` and `nav` values. Circular number and loading indicators are reserved for sequence and status.

Borders are thin and quiet on both light and dark surfaces. The optical raster clips to the proof window, while the transfer strip deliberately crosses its lower edge to make the process feel connected.

### Named Rules

**The Dominant Window Rule.** The 28px optical proof window is the largest silhouette; ordinary controls stay within the functional radius range.

## Components

### Buttons

- **Shape:** primary and reciprocal hero actions use a 12px radius and 52px minimum height.
- **Primary:** solid cobalt with white text and a literal upload-direction icon.
- **Secondary:** translucent deep ink with a mint border and light mint text, preserving equal clarity without competing for primary emphasis.
- **Hover / Focus:** hero actions lift by 2px over 180ms; cobalt darkens and the reciprocal action gains a mint tint. Keyboard focus is a 3px cobalt outline with 3px offset.
- **Reduced Motion:** the global reduced-motion query collapses animation and transition duration to 0.01ms and disables smooth scrolling.

### Cards / Containers

- **Proof Window:** deep ink, authored optical raster, dark directional shade, 28px desktop radius, and ambient proof shadow.
- **Working Containers:** dark neutral layers with 12–16px radii, thin neutral borders, and no elevation.
- **Transfer Strip:** white, 16px radius, three equal cells separated by hairlines, with mint number markers and literal step icons.

### Inputs / Fields

- **Style:** deep-ink fields use a compact 8px radius, white text, and neutral hairline border inside dark working surfaces.
- **Focus:** border shifts to mint in Send and cobalt in Receive while the global focus outline remains available to keyboard users.
- **File Drop:** a 16px-radius dark dashed target with a mint upload cue; selected files become compact bordered rows.

### Navigation

The sticky white header uses the LumenLink mark, centered icon-and-label navigation, and a bordered language switch. Items are transparent by default, gain a pale neutral hover, and use a quiet mint-teal active state. Below 1080px the nav becomes a separate horizontal scrolling row instead of wrapping labels or hiding destinations.

### Optical Proof Scene

The home signature is an authored, text-free WebP showing a laptop-to-camera transfer. A directional shade protects headline contrast, and a bounded six-second brightness/saturation pulse suggests live optical activity without moving layout or inventing protocol behavior.

## Do's and Don'ts

### Do:

- **Do** use cobalt for the one clearest action and mint for optical, local, selected, or positive signal.
- **Do** keep dark working surfaces flat, separated by neutral hairlines and tonal layers.
- **Do** use literal Lucide icons beside action labels; icons support text rather than replace it.
- **Do** preserve English and Russian legibility with the shipped Onest variable subsets.
- **Do** stack the proof composition and functional regions cleanly on mobile.
- **Do** preserve the reduced-motion fallback for every new animation or transition.

### Don't:

- **Don't** turn the shell into a field of nested cards or competing elevated panels.
- **Don't** spread cobalt and mint across decorative accents that weaken their action and signal meanings.
- **Don't** substitute generic stock imagery, abstract cloud graphics, or surveillance theatrics for the authored optical proof.
- **Don't** introduce decorative icon styles when literal Lucide actions already express the function.
- **Don't** make transfer status, progress, or errors depend on color alone.
