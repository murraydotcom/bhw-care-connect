import assert from 'node:assert/strict';
import test from 'node:test';

import maintenance, { config } from '../netlify/edge-functions/care-connect-maintenance.js';

test('maintenance edge gate covers every Care Connect route', () => {
  assert.equal(config.path, '/*');
});

test('patient pages return a no-store 503 maintenance page with safe help routes', async () => {
  const response = await maintenance(new Request('https://mybhw.com/patient/'));
  const html = await response.text();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(html, /The BHW Crew is improving myBHW/);
  assert.match(html, /smoother, safer way to connect with your care team/i);
  assert.match(html, /temporarily unavailable/i);
  assert.match(html, /443\.762\.5343/);
  assert.match(html, /call 911/i);
  assert.match(html, /call or text 988/i);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /<input\b/i);
});

test('patient APIs fail closed and state that nothing was accepted or saved', async () => {
  const response = await maintenance(new Request(
    'https://mybhw.com/api/patient-portal/check-ins',
    { method: 'POST', headers: { accept: 'application/json' } },
  ));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.deepEqual({
    ok: body.ok,
    maintenance: body.maintenance,
    accepted: body.accepted,
    saved: body.saved,
  }, {
    ok: false,
    maintenance: true,
    accepted: false,
    saved: false,
  });
});

test('direct Netlify function calls and HEAD requests are also blocked', async () => {
  const directFunction = await maintenance(new Request(
    'https://bhw-care-connect.netlify.app/.netlify/functions/patient-auth',
  ));
  assert.equal(directFunction.status, 503);
  assert.match(directFunction.headers.get('content-type'), /^application\/json/);

  const head = await maintenance(new Request('https://mybhw.com/', { method: 'HEAD' }));
  assert.equal(head.status, 503);
  assert.equal(await head.text(), '');
});
