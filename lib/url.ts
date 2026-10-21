// Builds "path?query" with one search param set (or removed with null), keeping the others.
// e.g. withSearchParam('/career/job-search', 'status=SENT', 'panel', 'app_1')
//   → '/career/job-search?status=SENT&panel=app_1'
export function withSearchParam(
  pathname: string,
  current: string | URLSearchParams,
  key: string,
  value: string | null
): string {
  const params = new URLSearchParams(current);
  if (value === null) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
