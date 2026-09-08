import nodemailer, { Transporter } from 'nodemailer';

export interface WelcomeEmailParams {
  to: string;
  nom: string;
  region: string;
  culture: string;
  surfaceHa: number;
  typeIrrigation: string;
}

export interface SendEmailResult {
  success: boolean;
  isRealDelivery: boolean;
  messageId?: string;
  previewUrl?: string | false;
  htmlContent?: string;
  subject?: string;
  error?: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<SendEmailResult> {
  const { to, nom, region, culture, surfaceHa, typeIrrigation } = params;

  // 1. Vérifier si un serveur SMTP personnalisé est configuré
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'AGRIMPACT Sénégal <contact@agrimpact.sn>';

  const subject = `🌱 Bienvenue sur AGRIMPACT — Votre exploitation à ${region} est configurée`;
  const textContent = `Bienvenue sur AGRIMPACT, ${nom} !\n\nVotre exploitation à ${region} (${culture}, ${surfaceHa} ha, ${typeIrrigation}) a bien été enregistrée.\nAccédez à vos conseils agronomiques et alertes météo sur : http://localhost:3000/dashboard\n\nBesoin d'aide ? Contactez notre conseiller au 33 800 12 12.`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 16px; color: #2d3748; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #166534; padding: 26px 20px; text-align: center; color: #ffffff; }
    .logo { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
    .sublogo { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #bbf7d0; margin-top: 4px; font-weight: 600; }
    .content { padding: 26px 20px; }
    h1 { font-size: 20px; color: #111827; margin-top: 0; font-weight: 800; }
    p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 10px 0; }
    .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 18px 0; }
    .card-title { font-size: 12px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .param-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #dcfce7; }
    .param-row:last-child { border-bottom: none; }
    .param-label { color: #4b5563; }
    .param-val { font-weight: 700; color: #111827; }
    .button { display: block; text-align: center; background: #166534; color: #ffffff !important; padding: 14px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; margin: 22px 0 16px 0; box-shadow: 0 2px 4px rgba(22, 101, 52, 0.2); }
    .contact-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px; font-size: 12px; color: #92400e; margin-top: 18px; line-height: 1.5; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; padding: 18px 20px; background: #f9fafb; border-top: 1px solid #e5e7eb; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌱 AGRIMPACT</div>
      <div class="sublogo">Terroir & Résilience Agronomique • Sénégal</div>
    </div>
    <div class="content">
      <h1>Bienvenue sur AGRIMPACT, ${nom} !</h1>
      <p>Votre exploitation a été enregistrée avec succès. Vous bénéficiez dès à présent des prévisions agro-météo de l'ANACIM et de recommandations adaptées à votre parcelle.</p>
      
      <div class="card">
        <div class="card-title">📋 Fiche officielle de votre exploitation</div>
        <div class="param-row"><span class="param-label">Région agricole :</span><span class="param-val">${region} (Sénégal)</span></div>
        <div class="param-row"><span class="param-label">Culture principale :</span><span class="param-val">${culture}</span></div>
        <div class="param-row"><span class="param-label">Surface parcelle :</span><span class="param-val">${surfaceHa} hectares</span></div>
        <div class="param-row"><span class="param-label">Système d'irrigation :</span><span class="param-val">${typeIrrigation}</span></div>
      </div>

      <p>Nos modèles de calcul ont synchronisé vos données d'humidité des sols et les risques caniculaires pour <strong>${region}</strong>.</p>

      <a href="http://localhost:3000/dashboard" class="button">Accéder à mon Tableau de Bord →</a>

      <div class="contact-box">
        <strong>📞 Ligne directe agronome :</strong> Une question sur vos parcelles ou votre météo ? Appelez votre conseiller au <strong>33 800 12 12</strong> (numéro vert gratuit).
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} AGRIMPACT Sénégal — Plateforme d'intelligence agricole ouest-africaine.<br>
      Ce récapitulatif a été envoyé à l'adresse <strong>${to}</strong>.
    </div>
  </div>
</body>
</html>
  `;

  // Cas 1 : SMTP réel configuré (envoi effectif vers la boîte email de l'utilisateur)
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        isRealDelivery: true,
        messageId: info.messageId,
        htmlContent,
        subject,
      };
    } catch (smtpErr: any) {
      console.error('Erreur SMTP direct:', smtpErr);
      // Fallback avec notification d'erreur SMTP
      return {
        success: true,
        isRealDelivery: false,
        htmlContent,
        subject,
        error: `Erreur d'envoi SMTP (${smtpErr.message}). L'email est visualisable ci-dessous.`,
      };
    }
  }

  // Cas 2 : Pas de SMTP configuré -> Tentative rapide Ethereal avec timeout de 2.5s pour ne pas bloquer l'UI
  let previewUrl: string | false = false;
  try {
    const etherealPromise = (async () => {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return nodemailer.getTestMessageUrl(info);
    })();

    // Timeout 2.5s
    const timeoutPromise = new Promise<false>((resolve) => setTimeout(() => resolve(false), 2500));
    previewUrl = await Promise.race([etherealPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Mode Ethereal ignoré ou indisponible:', err);
  }

  return {
    success: true,
    isRealDelivery: false,
    previewUrl,
    htmlContent,
    subject,
  };
}
