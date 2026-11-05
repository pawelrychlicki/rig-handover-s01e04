import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const night = '2026-10-30';

async function withTempRuns(
  test: (app: ReturnType<typeof createApp>, runsDir: string) => Promise<void>,
) {
  const runsDir = await mkdtemp(join(tmpdir(), 'rig-digest-routes-'));
  const app = createApp({
    adapter: 'test',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });

  try {
    await test(app, runsDir);
  } finally {
    await rm(runsDir, { recursive: true, force: true });
  }
}

async function writeNight(runsDir: string, contents: string) {
  await writeFile(join(runsDir, `${night}.jsonl`), contents);
}

describe('digest routes', () => {
  it('returns matching HTML and JSON rows for a populated night', async () => {
    await withTempRuns(async (app, runsDir) => {
      await writeNight(
        runsDir,
        [
          JSON.stringify({
            at: '2026-10-30T01:01:00+01:00',
            job: 'zeta/task',
            status: 'ok',
            owner: 'ana',
          }),
          JSON.stringify({
            at: '2026-10-30T01:00:00+01:00',
            job: 'alpha/task',
            status: 'retry',
            owner: null,
            error: 'timed out',
          }),
        ].join('\n'),
      );

      const [page, api] = await Promise.all([
        app.request(`/digest/${night}`),
        app.request(`/api/digest/${night}`),
      ]);

      expect(page.status).toBe(200);
      expect(page.headers.get('content-type')).toContain('text/html');
      const html = await page.text();
      expect(html).toContain('alpha/task');
      expect(html).toContain('zeta/task');
      expect(html.indexOf('alpha/task')).toBeLessThan(html.indexOf('zeta/task'));

      expect(api.status).toBe(200);
      expect(api.headers.get('content-type')).toContain('application/json');
      const digest: unknown = JSON.parse(await api.text());
      expect(digest).toMatchObject({
        rows: [{ job: 'alpha/task' }, { job: 'zeta/task' }],
      });
    });
  });

  it('returns 404 for a missing night on both routes', async () => {
    await withTempRuns(async (app) => {
      const [page, api] = await Promise.all([
        app.request(`/digest/${night}`),
        app.request(`/api/digest/${night}`),
      ]);

      expect(page.status).toBe(404);
      expect(api.status).toBe(404);
    });
  });

  it('renders an empty night on both routes', async () => {
    await withTempRuns(async (app, runsDir) => {
      await writeNight(runsDir, '');

      const [page, api] = await Promise.all([
        app.request(`/digest/${night}`),
        app.request(`/api/digest/${night}`),
      ]);

      expect(page.status).toBe(200);
      expect(await page.text()).toContain('nothing ran');
      expect(api.status).toBe(200);
      const digest: unknown = JSON.parse(await api.text());
      expect(digest).toMatchObject({ rows: [] });
    });
  });

  it('serves valid rows when a night contains a malformed line', async () => {
    await withTempRuns(async (app, runsDir) => {
      await writeNight(
        runsDir,
        [
          'not-json',
          JSON.stringify({
            at: '2026-10-30T01:00:00+01:00',
            job: 'valid/task',
            status: 'ok',
            owner: 'rook',
          }),
        ].join('\n'),
      );

      const [page, api] = await Promise.all([
        app.request(`/digest/${night}`),
        app.request(`/api/digest/${night}`),
      ]);

      expect(page.status).toBe(200);
      expect(await page.text()).toContain('valid/task');
      expect(api.status).toBe(200);
      const digest: unknown = JSON.parse(await api.text());
      expect(digest).toMatchObject({
        rows: [{ job: 'valid/task' }],
        malformedLines: 1,
      });
    });
  });
});
