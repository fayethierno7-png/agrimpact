/**
 * Client Resend officiel & utilitaires d'envoi d'emails pour AGRIMPACT.
 *
 * Règles de sécurité :
 * 1. La clé API est lue STRICTEMENT depuis la variable d'environnement RESEND_API_KEY.
 * 2. Jamais de clé en dur, jamais d'exposition côté client, jamais de console.log de la clé.
 * 3. Utilisable côté serveur uniquement (Server Components, Route Handlers, Server Actions).
 */

export {
  resend,
  getResendClient,
  getFromEmail,
  sendOtpViaResend,
  notifyAdminViaResend,
  FROM_EMAIL,
} from './email/resend';

export type {
  SendOtpEmailParams,
  ResendDeliveryResult,
} from './email/resend';
