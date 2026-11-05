import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunStatus, RunStatusCounts } from './types.js';

type Run = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error: string | null;
};

function parseRun(line: string): Run | null {
  let value: unknown;
  try {
    value = JSON.parse(line) as unknown;
  } catch {
    return null;
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const run = value as Record<string, unknown>;
  if (
    typeof run.at !== 'string' ||
    !run.at.trim() ||
    typeof run.job !== 'string' ||
    !run.job.trim() ||
    (run.status !== 'ok' && run.status !== 'retry' && run.status !== 'fail') ||
    (run.owner !== null && typeof run.owner !== 'string') ||
    (run.error !== undefined && typeof run.error !== 'string')
  ) {
    return null;
  }

  return {
    at: run.at,
    job: run.job,
    status: run.status,
    owner: run.owner,
    error: typeof run.error === 'string' ? run.error : null,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) {
    throw new RangeError('night must be YYYY-MM-DD');
  }

  const lines = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8').split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const rows = new Map<string, DigestRow>();
  let malformedLines = 0;
  const statusCounts: RunStatusCounts = { ok: 0, retry: 0, fail: 0 };

  for (const line of lines) {
    const run = parseRun(line);
    if (!run) {
      malformedLines += 1;
      continue;
    }

    statusCounts[run.status] += 1;

    const row = rows.get(run.job);
    if (!row) {
      rows.set(run.job, {
        job: run.job,
        owner: run.owner,
        runs: 1,
        retries: run.status === 'retry' ? 1 : 0,
        lastStatus: run.status,
        lastError: run.error,
        firstAt: run.at,
        lastAt: run.at,
      });
      continue;
    }

    row.owner = run.owner;
    row.runs += 1;
    row.retries += run.status === 'retry' ? 1 : 0;
    row.lastStatus = run.status;
    row.lastError = run.error;
    row.lastAt = run.at;
  }

  return { rows: [...rows.values()], malformedLines, statusCounts };
};
