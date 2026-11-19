import { isIP } from 'node:net';

/** Conservative public-unicast policy, rejecting private and special-use ranges. */
export function isPublicVideoAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || a === 100 && b >= 64 && b <= 127
      || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31
      || a === 192 && (b === 168 || b === 0 && (c === 0 || c === 2) || b === 88 && c === 99)
      || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)
      || a === 203 && b === 0 && c === 113);
  }
  if (family !== 6 || address.includes('%') || address.includes('.')) return false;
  const groups = address.toLowerCase().split(':');
  const first = Number.parseInt(groups[0] || '0', 16), second = Number.parseInt(groups[1] || '0', 16);
  // Only global-unicast 2000::/3, excluding protocol, documentation and 6to4 ranges.
  return first >= 0x2000 && first <= 0x3fff
    && !(first === 0x2001 && (second <= 0x01ff || second === 0x0db8))
    && first !== 0x2002 && !(first === 0x3fff && second <= 0x0fff);
}
