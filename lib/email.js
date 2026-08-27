const FROM    = process.env.SENDER_EMAIL || 'chon@maternalmind.es';
const APP_URL = process.env.APP_URL || 'https://www.maternalmind.es';

function gmailAuth(google) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

function buildRaw(to, subject, html) {
  const b64 = Buffer.from(subject, 'utf-8').toString('base64');
  const msg = [
    `To: ${to}`,
    `From: Maternal Mind <${FROM}>`,
    `Subject: =?UTF-8?B?${b64}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n');
  return Buffer.from(msg, 'utf-8').toString('base64url');
}

async function send(to, subject, html) {
  // Carga perezosa: 'googleapis' son ~800 ficheros; solo se leen al enviar de verdad,
  // no al arrancar el servidor (evita arranques lentísimos con la caché de disco fría).
  const { google } = require('googleapis');
  const gmail = google.gmail({ version: 'v1', auth: gmailAuth(google) });
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: buildRaw(to, subject, html) },
  });
}

function wrapEmail(content) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f4;">
<tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:100%;">
<tr><td style="padding:24px 36px;border-bottom:1px solid #EEF9F8;">
  <span style="font-family:Arial,sans-serif;font-size:13px;color:#5BBFB9;letter-spacing:.06em;">maternal</span>
  <span style="font-family:Arial,sans-serif;font-size:13px;color:#F2C14E;font-weight:bold;letter-spacing:.06em;margin-left:4px;">mind</span>
</td></tr>
<tr><td style="padding:36px;">${content}</td></tr>
<tr><td style="padding:24px 36px;background:#EEF9F8;border-top:1px solid #C8EDEB;">
  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#5BBFB9;text-align:center;">© 2026 Maternal Mind · <a href="https://maternalmind.es/app/cliente/" style="color:#5BBFB9;text-decoration:none;">Acceder a la plataforma</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function activationEmail(nombre, activationUrl) {
  const content = `
    <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;font-style:italic;color:#3A3A3A;">Hola, ${nombre} 🌿</p>
    <p style="margin:0 0 16px;color:#5E5E5E;line-height:1.75;">Gracias por dejarme tu correo y por el interés en Maternal Mind. Me alegra mucho que estés aquí.</p>
    <p style="margin:0 0 16px;color:#5E5E5E;line-height:1.75;">No te lo había anunciado, pero quiero agradecértelo con algo: tu <strong style="color:#3A3A3A;">Kit de Pausa</strong> — cinco prácticas pequeñas y reales para volver a ti en cualquier momento del día.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${APP_URL}/kit" style="display:inline-block;background:#7DCFCA;color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:17px 48px;border-radius:8px;">Abrir mi Kit de Pausa →</a>
    </div>
    <p style="margin:0 0 16px;color:#5E5E5E;line-height:1.75;">Y si además quieres tu espacio en Maternal Mind —los círculos y eventos, el blog, el podcast—, puedes acceder cuando te apetezca eligiendo una contraseña:</p>
    <p style="margin:0 0 28px;text-align:center;"><a href="${activationUrl}" style="color:#4AADA7;font-family:Arial,sans-serif;font-size:15px;">Crear mi espacio en Maternal Mind →</a></p>
    <p style="margin:24px 0 8px;color:#5E5E5E;line-height:1.75;font-style:italic;">Con calma y cariño,<br><strong style="font-style:normal;color:#3A3A3A;">Chon</strong></p>
    <p style="margin:16px 0 0;color:#9EB5B7;font-size:13px;text-align:center;">Si no lo has solicitado, puedes ignorar este email.</p>`;
  return wrapEmail(content);
}

function kitEmail(nombre, kitUrl) {
  const content = `
    <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;font-style:italic;color:#3A3A3A;">Hola, ${nombre},</p>
    <p style="margin:0 0 16px;color:#5E5E5E;line-height:1.75;font-style:italic;">Gracias por estar aquí.</p>
    <p style="margin:0 0 24px;color:#5E5E5E;line-height:1.75;">Aquí tienes tu Kit de Pausa — cinco prácticas pequeñas y reales para volver a ti en cualquier momento del día.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${kitUrl}" style="display:inline-block;background:#7DCFCA;color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:17px 48px;border-radius:8px;">Acceder a mi Kit de Pausa →</a>
    </div>
    <p style="margin:24px 0 0;color:#5E5E5E;line-height:1.75;font-style:italic;">Con calma y cariño,<br><strong style="font-style:normal;color:#3A3A3A;">Chon</strong></p>`;
  return wrapEmail(content);
}

module.exports = { send, activationEmail, kitEmail, wrapEmail };
