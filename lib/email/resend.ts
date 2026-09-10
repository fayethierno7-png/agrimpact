import { Resend } from 'resend';

// Initialisation du client Resend côté serveur uniquement
const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Expéditeur officiel ou domaine de test Resend
// Note : Si aucun domaine personnalisé n'est encore vérifié sur resend.com,
// Resend impose d'utiliser 'onboarding@resend.dev' et d'envoyer vers l'adresse email du compte Resend.
// Une fois le domaine agrimpact.sn vérifié, définissez RESEND_FROM_EMAIL="AGRIMPACT <securite@agrimpact.sn>"
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  (process.env.NODE_ENV === 'production' && process.env.VERIFIED_DOMAIN
    ? `AGRIMPACT <securite@${process.env.VERIFIED_DOMAIN}>`
    : 'AGRIMPACT <onboarding@resend.dev>');

export interface SendOtpEmailParams {
  to: string;
  code: string;
  type: 'signup' | 'login';
  nom?: string;
}

export interface ResendDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envoie le code de confirmation OTP par email via Resend avec le branding officiel AGRIMPACT
 */
export async function sendOtpViaResend(params: SendOtpEmailParams): Promise<ResendDeliveryResult> {
  const { to, code, type, nom } = params;

  if (!resend) {
    return {
      success: false,
      error: "Clé API Resend non configurée (variable d'environnement RESEND_API_KEY manquante).",
    };
  }

  const actionText = type === 'signup' ? 'création de votre exploitation' : 'connexion à votre compte';
  const subject = `🌱 Votre code de confirmation AGRIMPACT : ${code}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #0C2B1E; padding: 28px 24px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 14px; background: #166534; font-size: 22px; margin-bottom: 10px; }
    .brand-title { font-size: 22px; font-weight: 900; letter-spacing: 0.5px; margin: 0; color: #ffffff; }
    .brand-subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #C8EF56; margin-top: 4px; font-weight: 700; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; }
    .desc { font-size: 13px; line-height: 1.6; color: #475569; margin: 12px 0 20px 0; }
    .code-card { background: #f0fdf4; border: 2px dashed #15803d; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #166534; margin-bottom: 8px; }
    .code-display { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0C2B1E; margin: 4px 0; }
    .code-expiry { font-size: 11px; color: #64748b; margin-top: 8px; font-weight: 500; }
    .alert-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px; font-size: 12px; color: #92400e; line-height: 1.5; margin-top: 24px; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">🌱</div>
      <h1 class="brand-title">AGRIMPACT</h1>
      <div class="brand-subtitle">Terroir & Intelligence Agronomique • Sénégal</div>
    </div>
    <div class="content">
      <p class="greeting">Bonjour ${nom ? `<strong>${nom}</strong>` : 'cher exploitant'},</p>
      <p class="desc">
        Vous avez initié une <strong>${actionText}</strong> sur AGRIMPACT. Pour garantir la sécurité de vos données parcellaires, veuillez saisir le code de vérification ci-dessous :
      </p>

      <div class="code-card">
        <div class="code-label">Code de confirmation unique</div>
        <div class="code-display">${code}</div>
        <div class="code-expiry">⏱️ Valable pendant 10 minutes uniquement</div>
      </div>

      <div class="alert-box">
        <strong>🔒 Sécurité :</strong> Ne communiquez ce code à personne. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} AGRIMPACT Sénégal — Plateforme d'intelligence agricole.<br>
      Ce message a été envoyé à <strong>${to}</strong>. Assistance agronome : 33 800 12 12.
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Erreur API Resend envoi OTP:', error);
      return {
        success: false,
        error: error.message || "Échec d'envoi par le serveur Resend.",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: any) {
    console.error('Exception Resend:', err);
    return {
      success: false,
      error: err?.message || 'Erreur inattendue lors de la communication avec Resend.',
    };
  }
}

/**
 * Envoie une alerte administrateur par email via Resend
 */
export async function notifyAdminViaResend(params: {
  type: 'nouvelle_inscription' | 'connexion';
  userNom?: string;
  userEmail?: string;
  userPhone?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const { type, userNom, userEmail, userPhone, ip, userAgent } = params;

  if (!resend) return;

  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'fayethierno7@gmail.com';
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' });
  const labelType = type === 'nouvelle_inscription' ? 'NOUVELLE INSCRIPTION' : 'CONNEXION COMPTE';
  const subject = `🔔 [Alerte Admin] ${labelType} : ${userNom || userEmail || 'Utilisateur'}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 14px; border: 1px solid #334155; padding: 24px;">
    <div style="margin-bottom: 16px;">
      <span style="display: inline-block; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; background: ${type === 'nouvelle_inscription' ? '#16a34a' : '#6366f1'}; color: white;">
        ${labelType}
      </span>
    </div>
    <h3 style="margin-top:0; color: white; font-size: 18px;">Alerte de sécurité AgrImpact</h3>
    <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 15px;">
      <tr style="border-bottom: 1px solid #334155;"><td style="padding: 8px 0; color: #94a3b8;">Horodatage Dakar :</td><td style="font-weight: bold; color: white; text-align: right;">${now}</td></tr>
      <tr style="border-bottom: 1px solid #334155;"><td style="padding: 8px 0; color: #94a3b8;">Nom :</td><td style="font-weight: bold; color: white; text-align: right;">${userNom || 'Non renseigné'}</td></tr>
      <tr style="border-bottom: 1px solid #334155;"><td style="padding: 8px 0; color: #94a3b8;">Email :</td><td style="font-weight: bold; color: white; text-align: right;">${userEmail || 'Non renseigné'}</td></tr>
      <tr style="border-bottom: 1px solid #334155;"><td style="padding: 8px 0; color: #94a3b8;">Téléphone :</td><td style="font-weight: bold; color: white; text-align: right;">${userPhone || 'Non renseigné'}</td></tr>
      <tr style="border-bottom: 1px solid #334155;"><td style="padding: 8px 0; color: #94a3b8;">Adresse IP :</td><td style="font-weight: bold; color: white; text-align: right;">${ip || 'Inconnue'}</td></tr>
    </table>
    <p style="font-size: 11px; color: #64748b; margin-top: 18px;">Navigateur : ${userAgent || 'Inconnu'}</p>
  </div>
</body>
</html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [adminEmail],
      subject,
      html,
    });
  } catch (err) {
    console.warn('Erreur notification admin Resend:', err);
  }
}
