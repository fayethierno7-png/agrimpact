/**
 * Liste centralisée des emails propriétaires/superadmin.
 * Filet de sécurité utilisé en complément du rôle stocké en base (`profiles.role`),
 * pour garantir l'accès admin même si le profil n'a pas encore été synchronisé.
 */
export const SUPERADMIN_EMAILS = [
  'fayethierno7@gmail.com',
  'drixnocap@gmail.com',
] as const;

const SUPERADMIN_EMAIL_LOCAL_PARTS = SUPERADMIN_EMAILS.map((e) => e.split('@')[0].toLowerCase());

export function isSuperadminEmail(email?: string | null): boolean {
  if (!email) return false;
  return (SUPERADMIN_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
}

/**
 * Correspondance approximative utilisée sur des champs secondaires (nom, téléphone,
 * identifiant) quand l'email n'est pas directement disponible.
 */
export function textMatchesSuperadmin(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SUPERADMIN_EMAIL_LOCAL_PARTS.some((part) => lower.includes(part));
}
