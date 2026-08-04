# BHW HQ

The staff **front door** for BHW Medical Group — a single, self-contained launchpad
that links the four top-level destinations (crewOS, RCM Command Center, welcometoBHW,
Care Connect), the signed-in staff studios, and the family of programs.

- **Zero build, zero dependencies.** One `index.html`. Brand tokens from
  `assets/bhw-tokens.css` are inlined so the page stands alone.
- **Theme-aware.** Black Opal (default) / Light Opal, resolved before first paint and
  persisted under `localStorage['bhw-theme']` — the same key the rest of the estate uses.
- **`noindex`** — this is an internal staff page, not meant for search engines.

## Deploy (Netlify, static)

Base directory blank · publish directory `bhw-hq` · no build command.

## Before it goes live — confirm two URLs

Both are marked `⚠` in the `DOORS` config at the bottom of `index.html`:

| Door            | Current href     | Set to |
| --------------- | ---------------- | ------ |
| BHWcrewOS       | `/index.html`    | the deployed crewOS URL (only correct if HQ ships inside the crewOS deploy) |
| BHW Care Connect| `#`              | the deployed Care Connect URL |

The other two doors (`bhw-rcm.netlify.app`, `welcometobhw.netlify.app`) are the live sites.

Edit the `DOORS`, `TOOLS`, and `FAMILY` arrays in `index.html` to change what HQ links to;
an entry with `href: null` renders as a locked "coming soon" tile.
