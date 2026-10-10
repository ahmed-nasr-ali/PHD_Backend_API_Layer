/**
 * Builds a readable log line from a Redis connection error. Some errors (e.g. "connection refused" on both ::1 and 127.0.0.1)
 * come with an empty message and keep the reason in `code`.
 * message set → "ECONNREFUSED connect ECONNREFUSED 127.0.0.1:6379" · message empty → "ECONNREFUSED" · nothing at all → the error's name
 */
export function describeRedisError(error: Error): string {
  const code = (error as NodeJS.ErrnoException).code;
  return [code, error.message].filter(Boolean).join(' ') || error.name;
}
