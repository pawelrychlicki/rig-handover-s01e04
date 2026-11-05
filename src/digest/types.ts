export type RunStatus = 'ok' | 'retry' | 'fail';

export type RunStatusCounts = Record<RunStatus, number>;

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  rows: DigestRow[];
  malformedLines: number;
  statusCounts: RunStatusCounts;
};

export type ReadNight = (runsDir: string, night: string) => NightDigest;
