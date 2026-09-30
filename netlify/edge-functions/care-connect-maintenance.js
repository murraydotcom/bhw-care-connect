// Temporary full-site safety gate. Remove this edge function from the deployed
// branch only after Care Connect release verification is complete.
const MAINTENANCE_MESSAGE =
  'The BHW Crew is improving myBHW. Patient access remains temporarily unavailable while we securely finish and verify the updates.';

const COMMON_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'Retry-After': '3600',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
};

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>The BHW Crew is improving myBHW</title>
  <style>
    :root {
      color-scheme: light;
      --navy: #153149;
      --teal: #2b6f7b;
      --gold: #d7b56d;
      --paper: #fbf8f1;
      --ink: #1f2a30;
      --muted: #5e686a;
      --line: #d8d2c6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 28px;
      background:
        radial-gradient(circle at 50% 12%, rgba(215, 181, 109, .22), transparent 28rem),
        linear-gradient(160deg, #eef6f6 0%, var(--paper) 58%, #f3eee5 100%);
      color: var(--ink);
      font-family: Aptos, "Segoe UI", Arial, sans-serif;
    }
    main {
      width: min(680px, 100%);
      padding: clamp(30px, 6vw, 58px);
      border: 1px solid rgba(21, 49, 73, .12);
      border-radius: 24px;
      background: rgba(255, 255, 255, .94);
      box-shadow: 0 24px 70px rgba(21, 49, 73, .14);
    }
    .brand {
      margin: 0 0 32px;
      color: var(--teal);
      font-size: .82rem;
      font-weight: 800;
      letter-spacing: .18em;
      text-transform: uppercase;
    }
    .rule {
      width: 56px;
      height: 4px;
      margin-bottom: 24px;
      border-radius: 999px;
      background: var(--gold);
    }
    h1 {
      margin: 0;
      color: var(--navy);
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(2rem, 7vw, 3.5rem);
      line-height: 1.04;
      letter-spacing: -.035em;
    }
    p { margin: 18px 0 0; font-size: 1.08rem; line-height: 1.65; }
    .help {
      margin-top: 30px;
      padding-top: 26px;
      border-top: 1px solid var(--line);
    }
    .help strong { color: var(--navy); }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 12px 18px;
      border: 2px solid var(--teal);
      border-radius: 999px;
      color: #fff;
      background: var(--teal);
      font-weight: 800;
      text-decoration: none;
    }
    .button.secondary { color: var(--teal); background: transparent; }
    .note { color: var(--muted); font-size: .93rem; }
    a:focus-visible { outline: 4px solid rgba(215, 181, 109, .65); outline-offset: 3px; }
  </style>
</head>
<body>
  <main aria-labelledby="maintenance-title">
    <p class="brand">BHW Medical Group · myBHW</p>
    <div class="rule" aria-hidden="true"></div>
    <h1 id="maintenance-title">The BHW Crew is improving myBHW</h1>
    <p>We are making secure updates to create a smoother, safer way to connect with your care team. myBHW will remain temporarily unavailable while we finish and verify this work.</p>
    <p class="note">For your privacy, this page does not accept messages, forms, sign-ins, or health information.</p>
    <section class="help" aria-label="How to get help">
      <p><strong>Need help with your care?</strong><br>Call BHW Medical Group at 443.762.5343.</p>
      <div class="actions">
        <a class="button" href="tel:+14437625343">Call BHW Medical Group</a>
        <a class="button secondary" href="tel:988">Call or text 988</a>
      </div>
      <p class="note">For a medical emergency, call 911. For a mental health crisis, call or text 988. This maintenance page does not change information already received by your care team.</p>
    </section>
  </main>
</body>
</html>`;

function isApiRequest(request) {
  const { pathname } = new URL(request.url);
  const accept = request.headers.get('accept') || '';
  return pathname.startsWith('/api/')
    || pathname.startsWith('/.netlify/functions/')
    || accept.includes('application/json');
}

export default async function careConnectMaintenance(request) {
  const apiRequest = isApiRequest(request);
  const headers = new Headers(COMMON_HEADERS);
  headers.set('Content-Type', apiRequest
    ? 'application/json; charset=utf-8'
    : 'text/html; charset=utf-8');

  if (request.method === 'HEAD') {
    return new Response(null, { status: 503, headers });
  }

  if (apiRequest) {
    return Response.json({
      ok: false,
      maintenance: true,
      accepted: false,
      saved: false,
      error: MAINTENANCE_MESSAGE,
      help: 'Call BHW Medical Group at 443.762.5343. For emergencies call 911; for a mental health crisis call or text 988.',
    }, { status: 503, headers });
  }

  return new Response(MAINTENANCE_HTML, { status: 503, headers });
}

export const config = {
  path: '/*',
};
