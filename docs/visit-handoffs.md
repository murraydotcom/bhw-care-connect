# BHW0000 visit and lab handoffs

The authenticated dashboard displays returned laboratory reports independently of released Blueprint interpretation. Raw results can appear with provider review pending; explanations appear only after Health Core provider review. The separate Visit Summary section displays provider-approved summary, instructions, and follow-up. It never receives the full signed note, private clinical interpretation, signer identifiers, or internal note hashes.

Provider-verified reported medication use is shown separately from prescribed directions. Existing portal messages remain the direct two-way conversation path from Care Connect #29 and Health Core #134. Neither results nor visit summaries require a check-in or separate HTML link.

This PR depends on the matching Health Core synthetic visit handoff change and the existing messaging PRs. All real-patient switches remain off. No deployment or merge is performed; commit and PR title use `[skip netlify]` to prevent branch deploys and Deploy Previews.

Validation covers raw results before review, approved explanations, field allowlists, narrative rendered as text, signed-session binding, strict upstream origins, redirect refusal, and existing portal/check-in/Blueprint/message contracts. The actual three-handler BHW0000 journey passes 21 checkpoints using atomic, per-database Firestore doubles. See Health Core `docs/synthetic-visit-handoffs.md` and `scripts/verify-synthetic-visit-journey.mjs` for the complete workflow and reproduction.

The new patient sections are prepared for review. Private browser/session and live isolated database acceptance remain required. A later signed-note addendum withdraws an old visit summary until the provider approves updated wording. Lab vendor connectivity, original document delivery, attachment scanning, and prescribing are separate integrations.
