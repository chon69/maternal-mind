const { Readable } = require('stream');
const { google } = require('googleapis');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

const FOLDER_NAME = 'Maternal Mind Assets';

async function getOrCreateFolder(drive) {
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  if (res.data.files.length > 0) return res.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return folder.data.id;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    const { filename, mimeType, data } = JSON.parse(event.body || '{}');
    if (!filename || !mimeType || !data) return fail('filename, mimeType y data son requeridos');

    const buffer = Buffer.from(data, 'base64');
    const drive = google.drive({ version: 'v3', auth: getAuth() });

    const folderId = await getOrCreateFolder(drive);

    const upload = await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: 'id',
    });

    const fileId = upload.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    // Direct link for audio/media embeds
    const url = `https://drive.google.com/uc?id=${fileId}&export=download`;
    return ok({ url, fileId });
  } catch (err) {
    console.error(err);
    return fail(err.message || 'Error al subir archivo', 500);
  }
};
