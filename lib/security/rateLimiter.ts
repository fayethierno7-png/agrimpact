import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

// Cache en mémoire pour les requêtes par clé
const memoryStore = new Map<string, RateLimitRecord>();

// Nettoyage périodique des entrées expirées (toutes les 5 minutes)
let lastCleanup = Date.now();
function cleanupExpired(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // Nettoyage au plus une fois par minute
  lastCleanup = now;

  for (const [key, record] of memoryStore.entries()) {
    const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (validTimestamps.length === 0) {
      memoryStore.delete(key);
    } else {
      record.timestamps = validTimestamps;
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Limiteur de débit par fenêtre glissante (sliding window) en mémoire.
 * @param key Identifiant unique (ex: IP ou userId)
 * @param limit Nombre maximal de requêtes autorisées
 * @param windowMs Durée de la fenêtre en millisecondes (défaut: 60 000 ms = 1 minute)
 */
export function rateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  cleanupExpired(windowMs);

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Filtrer les timestamps situés dans la fenêtre glissante
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetTime = Math.ceil((oldest + windowMs - now) / 1000);

    return {
      success: false,
      limit,
      remaining: 0,
      reset: resetTime > 0 ? resetTime : 1,
    };
  }

  record.timestamps.push(now);

  return {
    success: true,
    limit,
    remaining: limit - record.timestamps.length,
    reset: Math.ceil(windowMs / 1000),
  };
}

/**
 * Extrait une clé de limitation de débit sécurisée à partir de la requête
 */
export function getClientIdentifier(req: NextRequest, prefix: string, userId?: string): string {
  if (userId) {
    return `${prefix}:user:${userId}`;
  }

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
  return `${prefix}:ip:${ip}`;
}
