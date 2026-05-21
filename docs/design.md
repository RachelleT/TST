# Design spec

## Principles

- **Calm.** Plenty of whitespace, gentle motion, no aggressive color.
- **Bookish but alive.** Serif word + sans body for personality. Color earns its place.
- **Card-as-object.** Each saved word is a tangible thing in a collection. Frames, zones, card numbers — like a curated trading card.
- **All-ages.** Adult-readable, child-welcoming. Nothing childish; nothing austere.
- **Accessibility-first.** WCAG AA contrast for all text on its background. Color is never the sole signal.

## Palette

### Base (always present)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `surface.page` | `#FBF9F5` (warm white) | `#1A1F1B` (near-black, slight green) | App background |
| `surface.card` | `#FFFFFF` | `#252B26` | Card interiors |
| `surface.elevated` | `#F4F0E6` (parchment) | `#2E342F` | Card sub-zones, soft fills |
| `text.primary` | `#1A2520` | `#F4F0E6` | Body, definitions |
| `text.secondary` | `#6B7568` | `#A8B0A6` | Pronunciation, meta, labels |
| `text.tertiary` | `#8A9088` | `#7A847B` | Card numbers, faintest meta |
| `border.subtle` | `#E5E0D2` | `#3A413B` | Card edges, zone separators |

### Accent

A single sage that signals the brand. Used sparingly: primary buttons, focus rings, selected states, the bookmark icon when filled.

| Token | Light | Dark |
|---|---|---|
| `accent.primary` | `#2F5240` | `#7CA890` |
| `accent.muted` | `#DDE9DE` | `#3F5D4C` |

### Part-of-speech frame colors

Each saved word card has a colored outer frame indicating its part of speech. Frame colors are vivid in light mode, slightly muted in dark mode to avoid glow. **The label text inside the colored badge always uses the darkest stop from that color family — never black or generic gray.**

| Part of speech | Frame (light) | Frame (dark) | Badge fill | Badge text |
|---|---|---|---|---|
| Noun | `#993C1D` (coral) | `#A35238` | `#F0997B` | `#4A1B0C` |
| Verb | `#185FA5` (blue) | `#3A7BB8` | `#85B7EB` | `#042C53` |
| Adjective | `#2F5240` (sage) | `#5C7B66` | `#EF9F27` | `#4A2515` |
| Adverb | `#534AB7` (purple) | `#7068C9` | `#AFA9EC` | `#26215C` |
| Preposition | `#7A5A0F` (amber) | `#A07B2A` | `#F4C775` | `#412402` |
| Conjunction | `#1F6E56` (teal) | `#3F8A75` | `#9FE1CB` | `#04342C` |
| Interjection | `#993556` (pink) | `#B0507A` | `#F4C0D1` | `#4B1528` |
| Pronoun | `#5F5E5A` (warm gray) | `#888780` | `#D3D1C7` | `#2C2C2A` |

Pronoun = warm gray (least flashy, least common). The eight categories cover virtually all words encountered by the dictionary API. If the API returns a part of speech not in this list, default to pronoun-gray and log the unknown POS to the admin dashboard.

## Typography

Two families. Available from Expo Google Fonts:

- **Serif: Source Serif Pro** — used for the word itself (the "subject" of every card), and the app's wordmark. Weights: 400 regular, 500 medium.
- **Sans: Inter** — used for everything else. Weights: 400 regular, 500 medium, 600 semibold.
- **Mono: JetBrains Mono** — used only for pronunciation syllable hints and card numbers. Weight: 400.

Type scale (mobile, in pt):

| Token | Size | Weight | Family | Usage |
|---|---|---|---|---|
| `display` | 32 | 500 | Serif | Word, on focused card detail |
| `title` | 24 | 500 | Serif | Word, on card preview |
| `headline` | 20 | 500 | Sans | Screen titles |
| `body` | 16 | 400 | Sans | Definitions, body text |
| `body.medium` | 16 | 500 | Sans | Emphasized body |
| `caption` | 13 | 400 | Sans | Sentence, secondary info |
| `meta` | 11 | 500 | Sans | Zone labels (uppercase, letterspaced) |
| `pronunciation` | 13 | 400 | Mono | el·o·quent |
| `cardnumber` | 10 | 400 | Mono | № 023 |

On tablets, scale up: `display` → 40, `title` → 30, `body` → 17.

Line height: 1.5 for body, 1.3 for titles, 1.1 for display.

## Card anatomy

The signature visual. Every saved word is one of these. Same structure on card preview (in library, smaller) and card detail (full screen, larger).

```
┌──────────────────────────────────┐
│ [colored frame, 6–10px]          │
│  ┌────────────────────────────┐  │
│  │ eloquent          [adj]    │  │ ← header zone
│  │ el·o·quent                 │  │ ← pronunciation
│  │  ┌──────────────────────┐  │  │
│  │  │                      │  │  │
│  │  │   [fact illustration] │  │  │ ← fact portrait zone
│  │  │   Japan · 日本        │  │  │   (with tap-to-expand)
│  │  │              [flag]   │  │  │
│  │  └──────────────────────┘  │  │
│  │  DEFINITION                │  │
│  │  Fluent or persuasive...   │  │ ← definition zone
│  │  ┃ IN A SENTENCE           │  │
│  │  ┃ An eloquent speech.     │  │ ← sentence zone (left accent bar)
│  │  SIMILAR                   │  │
│  │  [chip] [chip] [chip]      │  │ ← synonyms zone
│  │  ─────────────────────     │  │
│  │  № 023            [♥]      │  │ ← footer
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Frame

- Outer rounded rectangle. Border radius: 18px on phone, 24px on tablet.
- Fill: solid part-of-speech color.
- Padding to inner card: 8px on phone, 10px on tablet.

### Inner surface

- Rounded rectangle. Border radius: 12px / 16px (inner is always smaller).
- Subtle vertical gradient from `surface.card` to `surface.elevated` (parchment feel). Falls back to flat `surface.card` if reduced motion is on.
- 0.5px border in `border.subtle`.

### Header zone

- Word on the left, large, serif. Color: darkest stop from the part-of-speech ramp.
- Part-of-speech badge on the right. Rounded pill, 999px radius. Badge fill and text colors per the table above. Always lowercase or abbreviated ("adj," "verb," "noun").

### Pronunciation

- Below header, small, mono font.
- Format: syllable-separated with middle dots: `el·o·quent`, `bib·li·o·phile`.
- Color: `text.secondary`.

### Fact portrait zone

- Rounded rectangle, 110–130px tall on phone.
- Background: a soft tone derived from the part-of-speech ramp (the 100 or 200 stop).
- Centered illustration (SVG) + name label below.
- Small uppercase tag in the top-right corner indicating fact category: FLAG, WONDER, STARS, ANIMAL, GEO.
- Tap → expand to show the one-sentence fact in a card-flip or modal.

### Definition zone

- Small uppercase label "DEFINITION" in meta type.
- Definition text in body type, 2–3 lines.

### Sentence zone

- Background: soft tint of part-of-speech color (use the 50 or 100 stop).
- Left border accent: 2px in a mid stop of the part-of-speech color.
- Small uppercase label "IN A SENTENCE" in meta type.
- Sentence in body type, italic.

### Synonyms zone

- Small uppercase label "SIMILAR" in meta type.
- Synonym chips: pill-shaped, white background, 0.5px border in part-of-speech 100 stop, text color in part-of-speech 600 stop.

### Footer

- Thin 0.5px separator line above.
- Left: card number, mono type, `text.tertiary` color. Format: `№ 023`.
- Right: bookmark icon. Filled when saved (always filled if visible from the library; outlined in search preview before saving).

## Iconography

- Use Tabler Icons (outline only) via `@tabler/icons-react-native`.
- Sizes: 16, 20, 24, 28. Color inherits from text color in context.
- Common icons: `IconArrowLeft`, `IconSearch`, `IconBookmark`, `IconBookmarkFilled`, `IconSettings`, `IconBell`, `IconCheck`, `IconX`, `IconDots`, `IconAlertCircle`.

## Motion

Calm and short. No bounce, no overshoot.

- **Default easing:** ease-out, 200ms.
- **Card flip (to reveal fact):** 350ms, 3D flip on horizontal axis.
- **Screen transitions:** native stack defaults (subtle slide).
- **Reduced motion respected:** all flips become instant cross-fades; all slides become instant. Honor `useReduceMotion()` from `react-native-reanimated`.

No looping animations. No attention-grabbing pulses or shimmers. The home screen is still.

## Layout: responsive

### Phone (default, ~390pt wide)

- Single column.
- Library: vertically stacked cards, full width minus 16pt margins.
- Card detail: takes the full screen.
- Bottom tab nav: 4 tabs.

### Tablet (≥768pt wide)

- Library: 3-column grid (or 2 if landscape is tight).
- Card detail: opens as a centered modal with a backdrop, not full-screen.
- Search: persistent search bar with results to the right of the input area.
- Bottom tab nav at phone width; switches to a side rail on landscape tablets.

Breakpoints: `phone < 600pt`, `tablet ≥ 600pt`, `tablet.landscape ≥ 900pt`.

## Onboarding visual notes

- The "two small things" intro screen shows a tilted card (slightly rotated, like it's being handed to you) so the metaphor is felt, not just told.
- Interest selection screen: pill buttons with the area name only — no icons (icons here tend to feel childish). Selected state uses `accent.muted` background and `accent.primary` text.
- Starter words screen: cards shown smaller (preview size), tap-to-save with an instant haptic + check overlay.

## Light/dark

Both modes mandatory. Both must be tested. Dark mode is not just inverted; it uses warmer near-blacks (the `#1A1F1B` slightly green base) to maintain the "bookish, calm" feel and avoid the harsh black of clinical apps.

Test rule: every screen should be screenshot-checked in both modes before a feature is marked done.

## Don't

- No drop shadows (except subtle 1px focus rings).
- No gradients other than the very subtle card-interior parchment.
- No emoji in app UI (the user may type emoji in free-text fields; we don't generate them).
- No exclamation marks in copy except in error states.
- No "all caps" headers larger than meta (11pt). Larger headers are sentence case.
- No badge dots on the app icon (we don't have notification counts to surface).
