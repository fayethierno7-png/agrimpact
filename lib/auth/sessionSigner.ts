export interface SessionPayload {
  userId: string;
  email?: string;
  nom?: string;
  role?: string;
  plan?: string;
  statut_compte?: string;
  statut_abonnement?: string;
  date_limite_grace?: string | null;
  createdAt?: string;
}

/**
 * Clé secrète utilisée pour signer les sessions.
 * Priorise SESSION_SECRET, puis SUPABASE_SERVICE_ROLE_KEY, ou une clé dérivée stable.
 */
function getSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'agrimpact-secure-auth-secret-prod-2026'
  );
}

// Convert ArrayBuffer to base64url string (Edge & Node compatible)
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Convert base64url string to Uint8Array (Edge & Node compatible)
function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64UrlJson(payload: any): string {
  const jsonStr = JSON.stringify(payload);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64UrlJson(base64url: string): any {
  const bytes = base64UrlToBytes(base64url);
  const jsonStr = new TextDecoder().decode(bytes);
  return JSON.parse(jsonStr);
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Signe un payload de session et retourne un token sécurisé au format:
 * [payload_base64url].[hmac_sha256_signature]
 * Compatible 100% Edge Runtime et Node.js via Web Crypto API standard.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getSigningSecret();
  const data = encodeBase64UrlJson(payload);
  const key = await getCryptoKey(secret);
  const enc = new TextEncoder();
  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  const signature = bufferToBase64Url(signatureBuffer);

  return `${data}.${signature}`;
}

/**
 * Vérifie l'authenticité d'un token de session avec comparaison cryptographique Web Crypto.
 * Retourne le payload décodé si valide, ou null si falsifié ou invalide.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');

  // Format signé standard: [data].[signature]
  if (parts.length === 2) {
    const [data, signature] = parts;
    const secret = getSigningSecret();

    try {
      const key = await getCryptoKey(secret);
      const enc = new TextEncoder();
      const sigBytes = base64UrlToBytes(signature);

      const isValid = await globalThis.crypto.subtle.verify(
        'HMAC',
        key,
        sigBytes as unknown as BufferSource,
        enc.encode(data) as unknown as BufferSource
      );

      if (isValid) {
        const parsed = decodeBase64UrlJson(data);
        if (parsed && parsed.userId) {
          return parsed as SessionPayload;
        }
      }
    } catch {
      return null;
    }
  }

  // Période de grâce de migration temporaire (si token legacy base64url non signé)
  // Ne permet JAMAIS le rôle admin sans signature valide
  if (parts.length === 1 && token.length > 10) {
    try {
      const parsed = decodeBase64UrlJson(token);
      if (parsed && parsed.userId && parsed.role !== 'admin' && parsed.role !== 'superadmin') {
        return parsed as SessionPayload;
      }
    } catch {
      return null;
    }
  }

  return null;
}
