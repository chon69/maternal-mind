const { google } = require('googleapis');

const FROM = process.env.SENDER_EMAIL || 'chon@maternalmind.es';

function gmailAuth() {
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
  const gmail = google.gmail({ version: 'v1', auth: gmailAuth() });
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
<tr><td style="padding:24px 36px;border-bottom:1px solid #EDF4F5;">
  <span style="font-family:Arial,sans-serif;font-size:13px;color:#5B9298;letter-spacing:.06em;">maternal</span>
  <span style="font-family:Arial,sans-serif;font-size:13px;color:#C4A882;font-weight:bold;letter-spacing:.06em;margin-left:4px;">mind</span>
</td></tr>
<tr><td style="padding:36px;">${content}</td></tr>
<tr><td style="padding:24px 36px;background:#EDF4F5;border-top:1px solid #C2D9DB;">
  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#5B9298;text-align:center;">© 2026 Maternal Mind · maternalmind.es</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function activationEmail(nombre, activationUrl) {
  const content = `
    <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;font-style:italic;color:#3A3A3A;">Hola, ${nombre} 🌿</p>
    <p style="margin:0 0 16px;color:#5E5E5E;line-height:1.75;">Me alegra mucho que estés aquí.</p>
    <p style="margin:0 0 16px;color:#5E5E5E;line-height:1.75;">He preparado para ti un espacio pensado para acompañarte en tu maternidad: el <strong style="color:#3A3A3A;">Kit de Bienvenida</strong> con tus primeras prácticas, los eventos y círculos donde encontrarte con otras madres, el blog y el podcast.</p>
    <p style="margin:0 0 28px;color:#5E5E5E;line-height:1.75;">Un clic y estás dentro. Solo tienes que elegir tu contraseña para acceder cuando quieras.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${activationUrl}" style="display:inline-block;background:#7AACB0;color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:17px 48px;border-radius:8px;">Acceder a mi Kit de Bienvenida →</a>
    </div>
    <p style="margin:24px 0 8px;color:#5E5E5E;line-height:1.75;font-style:italic;">Con calma y cariño,<br><strong style="font-style:normal;color:#3A3A3A;">Chon</strong></p>
    <p style="margin:16px 0 0;color:#9EB5B7;font-size:13px;text-align:center;">Este enlace expira en 72 horas. Si no lo has solicitado, ignora este email.</p>`;
  return wrapEmail(content);
}

function kitEmail(nombre, kitUrl) {
  const content = `
    <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;font-style:italic;color:#3A3A3A;">Hola, ${nombre},</p>
    <p style="margin:0 0 16px;color:#5E5E5E;line-height:1.75;font-style:italic;">Gracias por estar aquí.</p>
    <p style="margin:0 0 24px;color:#5E5E5E;line-height:1.75;">Aquí tienes tu Kit de Pausa — cinco prácticas pequeñas y reales para volver a ti en cualquier momento del día.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${kitUrl}" style="display:inline-block;background:#7AACB0;color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:17px 48px;border-radius:8px;">Acceder a mi Kit de Pausa →</a>
    </div>
    <p style="margin:24px 0 0;color:#5E5E5E;line-height:1.75;font-style:italic;">Con calma y cariño,<br><strong style="font-style:normal;color:#3A3A3A;">Chon</strong></p>`;
  return wrapEmail(content);
}

module.exports = { send, activationEmail, kitEmail, wrapEmail };
