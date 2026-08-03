# BHW Care Connect — project notes

## What this is
A patient-facing communication hub for **BHW Medical Group / Baltimore Healthcare and Wellness**.
Primary file: `BHW Care Connect Just Ask.dc.html` (the live design).
`BHW Care Connect Page Options.dc.html` is the earlier options canvas (three directions, 1a/1b/1c) — kept for reference; 1b became the working page.

## Audience & tone
Existing patients who need to reach us fast, find a resource, or get into their Health Blueprint.
Voice: warm, plainspoken, a little dry humor so people feel comfortable. Never clinical-cold, never cutesy.
Goal on landing: "I'm in the right place."

## Naming rules
- It is the **Personal Health Blueprint** (or "Health Blueprint"). **Never** "patient portal."
- Programs, in this order: **Primary Care → Mind & Mood → CharmEd Minds → Flow**.
- Recommendations section is **Ask NP Am**.
- Do not name the internal triage tool on the patient-facing page.

## Design system
Tokens in `tokens/tokens.css` + `tokens/fonts.css` ("Opal & Ironstone"). Look up real `--*` names before use.
- Type: Playfair Display (display), Montserrat (UI), Lora (long reading), Caveat (script token).
- "Good to see you" uses **Dancing Script** (loaded via Google Fonts in the helmet) — a true cursive, deliberately not Caveat.
- Light opal / Black opal theme toggle in the header; persists to `localStorage` key `bhw-cc-theme`.
- Iridescence = layered radial gradients in brand hues + `var(--edge-gold)`. Used on program cards and the Just Ask block.

## Page structure (do not reorder without asking)
1. Header — brush-circle logo mark behind the wordmark, nav, theme toggle
2. Masthead — BHW lockup at top of box, open-now status, announcements **listed** (not behind a button)
3. **Just Ask** — the heart of the page. Free-text box live-routes to a triage category; a form directly below asks name, DOB, Health Blueprint access, then category-specific questions; submitting reveals a troubleshooting panel
4. Program flip cards (click to turn)
5. Resources promo → Resources page
6. Crisis strip
7. Phone / text / Health Blueprint cards, then hours + address

Resources page: Ask NP Am body-map (click a region → recommendations with brand, why, discount code), education PDFs, Baltimore community resources.

## Assets
- `assets/bhw-lockup.png` — full logo lockup
- `assets/bhw-circles.svg` — brush circles for the header
- `assets/logo-primary-care.png` — caduceus mark, background removed, used as a faint card watermark
- Still needed: Mind & Mood, CharmEd Minds, Flow logos (background-free); care-team headshots; map asset; real phone/address/announcement copy; NP Am's real recommendation list; the body diagram illustration.

## Working preferences
- Program logos and imagery go in at low opacity, never full color.
- Template holes in `src` attributes break during streaming — use a `background-image` style hole instead.
- Keep changes targeted; don't redesign sections that weren't mentioned.
