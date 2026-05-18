const https = require('https');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');

const DB_ID = '7bf6ca6c73054454aa6b432374420b5f';

function notionRequest(path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path,
      method: body ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function extractText(richText) {
  if (!richText || !richText.length) return '';
  return richText.map(t => t.plain_text || '').join('');
}

function extractProperty(prop) {
  if (!prop) return '';
  switch (prop.type) {
    case 'title':       return extractText(prop.title);
    case 'rich_text':   return extractText(prop.rich_text);
    case 'select':      return prop.select?.name || '';
    case 'multi_select':return (prop.multi_select || []).map(s => s.name).join(', ');
    case 'url':         return prop.url || '';
    case 'date':        return prop.date?.start || '';
    case 'checkbox':    return prop.checkbox ? 'true' : 'false';
    case 'number':      return prop.number != null ? String(prop.number) : '';
    case 'files':       return (prop.files || []).map(f => f.external?.url || f.file?.url || '').filter(Boolean).join(', ');
    default:            return '';
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    // Fetch database schema (property names)
    const dbRes = await notionRequest(`/v1/databases/${DB_ID}`);
    if (dbRes.status === 404) {
      return ok({ connected: false, items: [], message: 'Base de datos no conectada. Comparte la base de datos con la integración "Maternal Mind" en Notion.' });
    }
    if (dbRes.status !== 200) {
      return fail(`Notion error ${dbRes.status}: ${dbRes.body.message || 'Error desconocido'}`, dbRes.status);
    }

    const dbTitle = extractText(dbRes.body.title) || 'Biblioteca';

    // Query pages
    const pages = [];
    let cursor = undefined;
    do {
      const queryBody = { page_size: 100 };
      if (cursor) queryBody.start_cursor = cursor;
      const res = await notionRequest(`/v1/databases/${DB_ID}/query`, queryBody);
      if (res.status !== 200) break;
      pages.push(...res.body.results);
      cursor = res.body.has_more ? res.body.next_cursor : null;
    } while (cursor);

    const items = pages.map(page => {
      const props = page.properties || {};
      const item = {
        id: page.id,
        url: page.url,
        cover: page.cover?.external?.url || page.cover?.file?.url || null,
        icon: page.icon?.emoji || null,
        created: page.created_time,
        updated: page.last_edited_time,
      };
      Object.entries(props).forEach(([key, val]) => {
        item[key] = extractProperty(val);
      });
      return item;
    });

    return ok({ connected: true, dbTitle, items });
  } catch (err) {
    console.error(err);
    return fail(err.message || 'Error al conectar con Notion', 500);
  }
};
