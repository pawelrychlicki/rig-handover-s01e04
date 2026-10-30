import type { DigestRow } from '../digest/types.js';

export function DigestPage({ night, rows }: { night: string; rows: DigestRow[] }) {
  const sortedRows = [...rows].sort((a, b) => a.job.localeCompare(b.job));

  return (
    <>
      <h1>digest · {night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first at</th>
            <th>last at</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr><td colSpan={8} class="mute">nothing ran</td></tr>
          ) : (
            sortedRows.map((row) => (
              <tr class={row.retries >= 3 || row.lastStatus === 'fail' ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
