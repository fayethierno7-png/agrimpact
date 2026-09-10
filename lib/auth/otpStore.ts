import nodemailer from 'nodemailer';
import { supabase, isSupabaseConfigured } from '../supabase/client';

// Store OTP en mémoire (clé: email/téléphone normalisé, valeur: { code, expiresAt, attempts })
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  type: 'signup' | 'login';
}

const otpMemoryStore = new Map<string, OtpEntry>();

export function generateOtpCode(): string {
  // Code numérique à 6 chiffres
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveOtp(identifier: string, code: string, type: 'signup' | 'login' = 'login'): Promise<void> {
  const key = identifier.trim().toLowerCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // Valide 10 minutes

  // Toujours enregistrer dans le cache rapide
  otpMemoryStore.set(key, {
    code,
    expiresAt,
    attempts: 0,
    type,
  });

  // Sauvegarde miroir en base de données Supabase (si table disponible)
  if (isSupabaseConfigured && supabase) {
    supabase
      .from('auth_otp_codes')
      .upsert({
        identifier: key,
        code,
        type,
        expires_at: new Date(expiresAt).toISOString(),
        used: false,
        created_at: new Date().toISOString(),
      }, { onConflict: 'identifier' })
      .then(() => {}, () => {});
  }
}

export async function verifyOtp(identifier: string, inputCode: string): Promise<{ valid: boolean; error?: string }> {
  const key = identifier.trim().toLowerCase();
  const entry = otpMemoryStore.get(key);

  // Vérification primaire mémoire
  if (entry) {
    if (Date.now() > entry.expiresAt) {
      otpMemoryStore.delete(key);
      return { valid: false, error: 'Le code de confirmation a expiré (durée de validité 10 minutes). Veuillez en demander un nouveau.' };
    }

    if (entry.attempts >= 5) {
      otpMemoryStore.delete(key);
      return { valid: false, error: 'Trop de tentatives erronées. Veuillez redemander un nouveau code.' };
    }

    entry.attempts += 1;

    if (entry.code !== inputCode.trim()) {
      return { valid: false, error: `Code incorrect (${5 - entry.attempts} tentative(s) restante(s)).` };
    }

    // Code valide : consommé à usage unique
    otpMemoryStore.delete(key);
    if (isSupabaseConfigured && supabase) {
      supabase.from('auth_otp_codes').update({ used: true }).eq('identifier', key).then(() => {}, () => {});
    }
    return { valid: true };
  }

  // Vérification de secours Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('auth_otp_codes')
        .select('*')
        .eq('identifier', key)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        if (new Date(data.expires_at).getTime() < Date.now()) {
          return { valid: false, error: 'Le code de confirmation a expiré (durée de validité 10 minutes). Veuillez en demander un nouveau.' };
        }
        if (data.code === inputCode.trim()) {
          await supabase.from('auth_otp_codes').update({ used: true }).eq('id', data.id);
          return { valid: true };
        } else {
          return { valid: false, error: 'Code de confirmation incorrect.' };
        }
      }
    } catch {}
  }

  return { valid: false, error: 'Aucun code de confirmation en attente ou le code a expiré.' };
}

/**
 * Envoie le code de confirmation par email à l'utilisateur
 */
export async function sendOtpEmail(
  to: string,
  code: string,
  type: 'signup' | 'login',
  nom?: string
): Promise<{ sent: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'AGRIMPACT Sécurité <securite@agrimpact.sn>';

  const actionText = type === 'signup' ? 'création de votre compte' : 'connexion';
  const subject = `🔐 Votre code de confirmation AGRIMPACT : ${code}`;
  
  const textContent = `Bonjour ${nom || ''},\n\nVotre code de confirmation pour votre ${actionText} sur AGRIMPACT est : ${code}\n\nCe code est valable pendant 10 minutes.\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nL'équipe AGRIMPACT Sénégal`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .head { background: #166534; padding: 24px; text-align: center; color: white; }
    .content { padding: 28px 24px; }
    .code-box { background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 18px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #15803d; margin: 24px 0; font-family: monospace; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; padding: 16px; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="head">
      <h2 style="margin:0; font-size: 20px;">🌱 AGRIMPACT SÉNÉGAL</h2>
      <p style="margin:4px 0 0 0; font-size: 12px; color: #bbf7d0;">Sécurité & Authentification</p>
    </div>
    <div class="content">
      <p style="margin-top:0; font-size: 14px; line-height: 1.5;">Bonjour <strong>${nom || 'Exploitant'}</strong>,</p>
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        Voici votre code de sécurité unique pour valider votre <strong>${actionText}</strong> sur la plateforme AGRIMPACT :
      </p>
      <div class="code-box">${code}</div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
        ⏱️ Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} AGRIMPACT Sénégal • Assistance : 33 800 12 12
    </div>
  </div>
</body>
</html>
  `;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { sent: true };
    } catch (err: any) {
      console.warn('Erreur envoi OTP SMTP:', err);
      return { sent: false, error: err?.message };
    }
  }

  // Mode Ethereal / Log développement
  console.log(`\n======================================================`);
  console.log(`[AGRIMPACT OTP] Destinataire: ${to} | Code: ${code} | Type: ${type}`);
  console.log(`======================================================\n`);
  return { sent: false, error: 'Serveur SMTP non configuré dans .env.local' };
}

/**
 * Notifie l'administrateur en temps réel (email + log) lors d'une tentative de connexion ou inscription
 */
export async function notifyAdminAuthAttempt(params: {
  type: 'nouvelle_inscription' | 'connexion';
  userNom?: string;
  userEmail?: string;
  userPhone?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const { type, userNom, userEmail, userPhone, ip, userAgent } = params;
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'fayethierno7@gmail.com';
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' });

  const labelType = type === 'nouvelle_inscription' ? 'NOUVELLE INSCRIPTION' : 'CONNEXION COMPTE';
  const subject = `🔔 [Alerte Admin] ${labelType} : ${userNom || userEmail || 'Utilisateur'}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .box { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; background: #0284c7; color: white; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #334155; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .val { font-weight: bold; color: #f8fafc; }
  </style>
</head>
<body>
  <div class="box">
    <div style="margin-bottom: 15px;">
      <span class="badge" style="background: ${type === 'nouvelle_inscription' ? '#16a34a' : '#6366f1'};">${labelType}</span>
    </div>
    <h3 style="margin-top:0; color: white;">Alerte d'accès plateforme AgrImpact</h3>
    <div class="row"><span>Date & Heure (Dakar) :</span><span class="val">${now}</span></div>
    <div class="row"><span>Nom :</span><span class="val">${userNom || 'Non renseigné'}</span></div>
    <div class="row"><span>Email :</span><span class="val">${userEmail || 'Non renseigné'}</span></div>
    <div class="row"><span>Téléphone :</span><span class="val">${userPhone || 'Non renseigné'}</span></div>
    <div class="row"><span>Adresse IP :</span><span class="val">${ip || 'Inconnue'}</span></div>
    <div class="row"><span>Navigateur :</span><span class="val" style="font-size:11px;">${userAgent ? userAgent.substring(0, 50) + '...' : 'Inconnu'}</span></div>
  </div>
</body>
</html>
  `;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'AGRIMPACT Alertes <alertes@agrimpact.sn>';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: smtpFrom,
        to: adminEmail,
        subject,
        html,
      });
    } catch (err) {
      console.warn('Erreur notification email admin:', err);
    }
  }

  console.log(`\n🔔 [ADMIN NOTIFIED] ${labelType} -> ${userNom || userEmail} (${now})`);
}
