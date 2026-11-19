export const PASSWORD_HASH_SCHEME = 'pbkdf2-sha256-v1';
const PBKDF2_ITERATIONS = 10_000;
const DOMAIN_PEPPER = 'nihonmaster_auth_v1';

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const SHA256_INIT = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256Bytes(input: Uint8Array): Uint8Array {
  const bitLenHi = Math.floor((input.length * 8) / 0x100000000);
  const bitLenLo = (input.length * 8) >>> 0;
  const paddedLen = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLenHi, false);
  view.setUint32(paddedLen - 4, bitLenLo, false);

  const hash = new Uint32Array(SHA256_INIT);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, hash[i], false);
  }
  return out;
}

function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const normKey = key.length > 64 ? sha256Bytes(key) : key;
  const ipad = new Uint8Array(64 + data.length);
  const opad = new Uint8Array(64 + 32);

  for (let i = 0; i < 64; i++) {
    const k = i < normKey.length ? normKey[i] : 0;
    ipad[i] = k ^ 0x36;
    opad[i] = k ^ 0x5c;
  }
  ipad.set(data, 64);
  const innerHash = sha256Bytes(ipad);
  opad.set(innerHash, 64);
  return sha256Bytes(opad);
}

export function pbkdf2Sha256Fallback(
  passwordBytes: Uint8Array,
  saltBytes: Uint8Array,
  iterations: number,
): Uint8Array {
  const saltBlock = new Uint8Array(saltBytes.length + 4);
  saltBlock.set(saltBytes);
  saltBlock[saltBytes.length] = 0;
  saltBlock[saltBytes.length + 1] = 0;
  saltBlock[saltBytes.length + 2] = 0;
  saltBlock[saltBytes.length + 3] = 1;

  let u = hmacSha256(passwordBytes, saltBlock);
  const dk = new Uint8Array(u);
  for (let i = 1; i < iterations; i++) {
    u = hmacSha256(passwordBytes, u);
    for (let j = 0; j < 32; j++) {
      dk[j] ^= u[j];
    }
  }
  return dk;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives a deterministic, salted 64-char hex digest (`PBKDF2-HMAC-SHA256`, 10k iterations)
 * from normalized email + raw password at the client before sending credentials over the wire.
 * Output fits within bcrypt's 72-byte ceiling on Supabase Auth without truncation.
 */
export async function deriveClientPasswordHash(email: string, rawPassword: string): Promise<string> {
  const encoder = new TextEncoder();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordBytes = encoder.encode(rawPassword);
  const saltBytes = encoder.encode(`${DOMAIN_PEPPER}:${normalizedEmail}`);

  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const keyMaterial = await subtle.importKey(
        'raw',
        passwordBytes,
        'PBKDF2',
        false,
        ['deriveBits'],
      );
      const bits = await subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        256,
      );
      return bytesToHex(new Uint8Array(bits));
    } catch {
      // Fall back cleanly to pure-JS PBKDF2 if Web Crypto is blocked in an insecure HTTP context
    }
  }

  return bytesToHex(pbkdf2Sha256Fallback(passwordBytes, saltBytes, PBKDF2_ITERATIONS));
}
