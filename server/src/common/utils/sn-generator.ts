const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a unique serial number (流水号).
 * Format: prefix + YYYYMMDDHHmmss + 4 random alphanumeric chars
 * Example: "CL20260413143022A1B2"
 */
export function generateSn(prefix = 'CL'): string {
  const now = new Date();
  const ts =
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());

  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  return prefix + ts + rand;
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
