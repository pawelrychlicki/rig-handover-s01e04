import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('aggregates each job and counts malformed lines in the sample night', () => {
    const digest = readNight('runs', '2026-10-28');

    expect(digest.malformedLines).toBe(1);
    expect(digest.rows).toHaveLength(5);
    expect(digest.rows.map(({ job }) => job).sort()).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(digest.rows.find(({ job }) => job === 'fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(digest.rows.find(({ job }) => job === 'digest/render')).toMatchObject({ owner: null });
  });

  it('rejects a night that is not a date before building a file path', () => {
    expect(() => readNight('runs', 'not-a-date')).toThrow(RangeError);
  });
});
