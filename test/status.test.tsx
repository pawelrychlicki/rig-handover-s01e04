import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board', () => {
  it('shows the lane banner and the nights on disk', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config).request('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('2026-10-28');
  });

  it('links each night to its digest and counts only valid run records', async () => {
    const runsDir = mkdtempSync(join(tmpdir(), 'rig-status-'));
    try {
      writeFileSync(
        join(runsDir, '2026-10-28.jsonl'),
        [
          JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'alpha', status: 'ok', owner: null }),
          JSON.stringify({ at: '2026-10-28T01:01:00+01:00', job: 'alpha', status: 'retry', owner: null }),
          JSON.stringify({ at: '2026-10-28T01:02:00+01:00', job: 'beta', status: 'fail', owner: 'rook' }),
          '{"broken"',
          JSON.stringify({ at: '2026-10-28T01:03:00+01:00', job: 'gamma', status: 'unknown', owner: null }),
        ].join('\n'),
      );
      writeFileSync(
        join(runsDir, '2026-10-27.jsonl'),
        [
          JSON.stringify({ at: '2026-10-27T01:00:00+01:00', job: 'alpha', status: 'ok', owner: null }),
          JSON.stringify({ at: '2026-10-27T01:01:00+01:00', job: 'beta', status: 'ok', owner: 'rook' }),
          JSON.stringify({ at: '2026-10-27T01:02:00+01:00', job: 'beta', status: 'fail', owner: 'rook' }),
        ].join('\n'),
      );

      const app = createApp({ ...config, runsDir });
      const res = await app.request('/');
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain('href="/digest/2026-10-28"');
      expect(html).toContain('ok: 1 · retry: 1 · fail: 1');
      expect(html).toContain('href="/digest/2026-10-27"');
      expect(html).toContain('ok: 2 · retry: 0 · fail: 1');

      for (const night of ['2026-10-28', '2026-10-27']) {
        const digest = await app.request(`/digest/${night}`);
        expect(digest.status).toBe(200);
      }
    } finally {
      rmSync(runsDir, { recursive: true, force: true });
    }
  });

  it('health answers with the lane id', async () => {
    const res = await createApp(config).request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });
});
