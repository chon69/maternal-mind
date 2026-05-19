const https    = require('https');
const { requireAuth, ok, fail, preflight } = require('../lib/auth');

const DB_ID = '7bf6ca6c73054454aa6b432374420b5f';

function notionRequest(path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path,
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization:   `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':  'application/json',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
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

function text(rt) {
  if (!rt?.length) return '';
  return rt.map(t => t.plain_text || '').join('');
}

function prop(p) {
  if (!p) return '';
  switch (p.type) {
    case 'title':        return text(p.title);
    case 'rich_text':    return text(p.rich_text);
    case 'select':       return p.select?.name || '';
    case 'multi_select': return (p.multi_select || []).map(s => s.name).join(', ');
    case 'url':          return p.url || '';
    case 'date':         return p.date?.start || '';
    case 'checkbox':     return p.checkbox ? 'true' : 'false';
    case 'number':       return p.number != null ? String(p.number) : '';
    case 'files':        return (p.files || []).map(f => f.external?.url || f.file?.url || '').filter(Boolean).join(', ');
    case 'files_meta':   return (p.files || []).map(f => f.name || '').filter(Boolean).join(', ');
    default:             return '';
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  let user;
  try { user = requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }

  const isPremium = (user.plan || 'free') === 'biblioteca_mami';

  try {
    const pages = [];
    let cursor;
    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const res = await notionRequest(`/v1/databases/${DB_ID}/query`, body);
      if (res.status !== 200) return fail(`Notion error ${res.status}`, res.status);
      pages.push(...res.body.results);
      cursor = res.body.has_more ? res.body.next_cursor : null;
    } while (cursor);

    const items = pages.map(page => {
      const p = page.properties || {};
      return {
        id:         page.id,
        titulo:     prop(p['Práctica'])   || prop(p['Nombre']) || prop(p['Name']) || '(sin título)',
        formato:    prop(p['Formato'])    || '',
        categoria:  prop(p['Categoría']) || prop(p['Categoria']) || '',
        duracion:   prop(p['Duración'])  || prop(p['Duracion'])  || '',
        notas:      prop(p['Notas'])     || '',
        frase:      prop(p['Frase semilla']) || '',
        archivo:        prop(p['Archivos multimedia']) || '',
        archivoNombre:  (p['Archivos multimedia']?.files?.[0]?.name || ''),
        cover:      page.cover?.external?.url || page.cover?.file?.url || null,
        icon:       page.icon?.emoji || null,
        created:    page.created_time,
      };
    });

    return ok({ isPremium, items });
  } catch (err) {
    console.error('Notion client error:', err);
    return fail('Error al conectar con Notion', 500);
  }
};
