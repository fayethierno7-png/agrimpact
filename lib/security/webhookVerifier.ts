import crypto from 'crypto';

/**
 * Vérification cryptographique des signatures HMAC-SHA256 pour les webhooks entrants
 * (UnitechPay, Wave, Orange Money, etc.)
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | undefined
): { valid: boolean; reason?: string } {
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 [SECURITE] Secret de webhook manquant en environnement de production.');
      return { valid: false, reason: 'Webhook secret non configuré sur le serveur' };
    }
    console.warn('⚠️ [DEV] Secret de webhook non configuré en environnement local.');
    return { valid: true };
  }

  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return { valid: false, reason: 'En-tête de signature absent' };
  }

  try {
    const cleanSignature = signatureHeader.replace(/^sha256=/, '').trim();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(cleanSignature, 'utf-8');
    const expBuf = Buffer.from(expectedSignature, 'utf-8');

    if (sigBuf.length !== expBuf.length) {
      return { valid: false, reason: 'Longueur de signature non concordante' };
    }

    const isValid = crypto.timingSafeEqual(sigBuf, expBuf);
    return isValid ? { valid: true } : { valid: false, reason: 'Signature HMAC invalide' };
  } catch (err: any) {
    return { valid: false, reason: 'Erreur lors du calcul de signature' };
  }
}
