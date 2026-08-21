// Test del circuito de activación contra la BD real (email interceptado).
// Uso: node test-activacion.js
const fs = require('fs');

// --- cargar .env.local manualmente ---
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2];
}
process.env.APP_URL = 'https://maternalmind.es';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// --- interceptar el envío de email ANTES de cargar los handlers ---
const email = require('./lib/email');
const sentEmails = [];
email.send = async (to, subject, html) => {
  const url = (html.match(/href="([^"]*activar\.html[^"]*)"/) || [])[1];
  sentEmails.push({ to, subject, url });
};

const jwt = require('jsonwebtoken');
const { findBy, deleteById, pool } = require('./lib/db');
const submitForm   = require('./api/submit-form').handler;
const setPassword  = require('./api/auth-set-password').handler;
const login        = require('./api/auth-login').handler;

const TEST_EMAIL = `test-circuito-${Date.now()}@maternalmind.test`;
const POST = body => ({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) });
const tokenOf = url => new URLSearchParams(url.split('?')[1]).get('token');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name} ${extra}`); fail++; }
}

(async () => {
  try {
    console.log(`\nEmail de prueba: ${TEST_EMAIL}\n`);

    // 1) Registro inicial
    console.log('1) Registro inicial (submit-form)');
    await submitForm(POST({ nombre: 'Madre Test', email: TEST_EMAIL }));
    const user1 = await findBy('Usuarios', 'email', TEST_EMAIL);
    const token1 = sentEmails.at(-1)?.url ? tokenOf(sentEmails.at(-1).url) : null;
    check('se crea el usuario como pendiente', user1 && user1.estado === 'pendiente');
    check('se envía email con enlace de activación', !!token1);
    check('el token del email coincide con el de la BD', token1 === user1.token_activacion);

    // 2) Re-registro: el token NO debe cambiar (enlace antiguo sigue válido)
    console.log('\n2) Re-registro (la madre vuelve a pasar por el formulario)');
    await submitForm(POST({ nombre: 'Madre Test', email: TEST_EMAIL }));
    const user2 = await findBy('Usuarios', 'email', TEST_EMAIL);
    const token2 = tokenOf(sentEmails.at(-1).url);
    check('el token de activación se mantiene (no caduca el enlace anterior)', token2 === token1, `(${token1} vs ${token2})`);
    check('el token en BD sigue siendo el mismo', user2.token_activacion === token1);

    // 3) Activación con el token del PRIMER email
    console.log('\n3) Activación con el enlace del primer email (auth-set-password)');
    const r3 = await setPassword(POST({ token: token1, email: TEST_EMAIL, password: 'miclave12345' }));
    const b3 = JSON.parse(r3.body);
    check('activación correcta (200)', r3.statusCode === 200, `→ ${r3.statusCode} ${r3.body}`);
    check('devuelve JWT de sesión', !!b3.token);

    // 4) El JWT de sesión NO caduca
    console.log('\n4) La sesión no caduca');
    const decoded = jwt.decode(b3.token);
    check('el JWT NO tiene claim de expiración (exp)', decoded && decoded.exp === undefined, `exp=${decoded && decoded.exp}`);

    const userActivo = await findBy('Usuarios', 'email', TEST_EMAIL);
    check('el usuario queda activo', userActivo.estado === 'activo');

    // 5) Segundo clic en el enlace ya usado → mensaje amable, no "Enlace inválido"
    console.log('\n5) Segundo clic en el enlace ya usado');
    const r5 = await setPassword(POST({ token: token1, email: TEST_EMAIL, password: 'otraclave12345' }));
    const b5 = JSON.parse(r5.body);
    check('responde 409 (cuenta ya activa)', r5.statusCode === 409, `→ ${r5.statusCode}`);
    check('mensaje guía a iniciar sesión', /ya está activa/i.test(b5.error || ''), `→ ${b5.error}`);

    // 6) Login con la contraseña establecida
    console.log('\n6) Login en la plataforma');
    const r6 = await login(POST({ email: TEST_EMAIL, password: 'miclave12345' }));
    const b6 = JSON.parse(r6.body);
    check('login correcto (200)', r6.statusCode === 200, `→ ${r6.statusCode} ${r6.body}`);
    check('login devuelve JWT sin caducidad', b6.token && jwt.decode(b6.token).exp === undefined);

  } catch (err) {
    console.error('\n💥 Error inesperado:', err);
    fail++;
  } finally {
    // limpieza
    const u = await findBy('Usuarios', 'email', TEST_EMAIL);
    if (u) await deleteById('Usuarios', u.id);
    const lead = await findBy('Leads', 'email', TEST_EMAIL);
    if (lead) await deleteById('Leads', lead.id);
    await pool.end();
    console.log(`\n────────────\nResultado: ${pass} OK, ${fail} fallos\n`);
    process.exit(fail ? 1 : 0);
  }
})();
