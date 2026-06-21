# Thread — AI Research Tool UI

A single-page, ultra-minimalist interface with a sticky header and a split-pane main canvas (PDF viewer + AI chat). Light/dark mode with smooth transitions, slate/zinc palette, Inter typography.

## Scope

Pure frontend, presentational only. No backend, no real PDF parsing, no real AI — mock conversation data only.

## Files to change

- `src/styles.css` — extend tokens with refined slate/zinc palette for both themes, soft borders, smooth color-transition base, Inter font family token. Add `<link>` for Inter in `__root.tsx` head (never `@import` URL in CSS per Tailwind v4 rules).
- `src/routes/__root.tsx` — add Inter `<link rel="stylesheet">` to head; update title/meta to "Thread".
- `src/routes/index.tsx` — replace placeholder with the Thread single-page UI.
- `src/components/thread/Header.tsx` — sticky top navbar: logo (lucide `Network` or `GitBranch` icon + "Thread" wordmark), Upload Document button, theme toggle.
- `src/components/thread/ThemeToggle.tsx` — class-based dark mode toggle on `<html>`, persists to `localStorage`, hydration-safe (reads pref in `useEffect`). Sun/Moon icons with smooth crossfade.
- `src/components/thread/DocumentPane.tsx` — left pane, rounded soft-bg container, centered empty state with large muted `FileText` icon and prompt copy.
- `src/components/thread/ChatPane.tsx` — right pane: scrollable message history + fixed pill input at the bottom.
- `src/components/thread/MessageBubble.tsx` — user (right, soft `bg-secondary` bubble, `text-secondary-foreground`) and assistant (left, no bg, avatar with lucide `Sparkles`-free mark — use `Atom` icon in a soft ring).

## Layout details

- Header: `sticky top-0 z-40`, `h-14`, soft bottom border (`border-border/60`), backdrop-blur.
- Main: `h-[calc(100vh-3.5rem)]`, `grid grid-cols-2 gap-8 p-8` (single column on `<md`).
- Panes: `rounded-2xl border border-border/60 bg-card/40` with subtle inner padding.
- Chat input: pill `rounded-full`, embedded send icon-button on the right, `focus-within:ring-2 ring-ring/40` smooth transition.

## Design tokens (Tailwind v4 via `@theme inline`)

- Light: near-white background, zinc-900 foreground, soft zinc-200 borders, muted zinc-100 surfaces, accent = zinc-900.
- Dark: zinc-950 background, zinc-100 foreground, white/10 borders, zinc-900 surfaces.
- Global `transition-colors duration-200` on body so theme toggle feels smooth.

## Mock chat content

3–4 exchanges about a sample paper (e.g., "Summarize the methodology", "What datasets were used?") to demonstrate styling of both roles.

## Out of scope

- Real file upload handling (button is visual only, no input wiring).
- Real PDF rendering.
- Routing beyond `/`.

