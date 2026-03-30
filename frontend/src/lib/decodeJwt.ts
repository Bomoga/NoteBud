/**
 * Read JWT claims without verifying the signature (display / client routing only).
 * Never use this for authorization decisions on the server.
 */
export function getSessionFromAccessToken(token: string): {
  userId: string;
  username: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const segment = parts[1];
    const padded = segment + '==='.slice((segment.length + 3) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64)) as {
      sub?: string;
      username?: string;
    };
    if (!json.sub) return null;
    return {
      userId: json.sub,
      username: typeof json.username === 'string' ? json.username : json.sub,
    };
  } catch {
    return null;
  }
}
