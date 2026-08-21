const { execSync } = require('child_process');
const fs = require('fs');

const BASE = '/Users/ascensionjorquera/Desktop/maternal-mind-stories';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">';

const HEADER = `
<div class="header">
  <div class="logo">
    <svg width="100" height="56" viewBox="0 0 52 28" fill="none">
      <ellipse cx="17" cy="14" rx="13" ry="13" stroke="#7DCFCA" stroke-width="3" fill="none"/>
      <ellipse cx="35" cy="14" rx="13" ry="13" stroke="#F2C14E" stroke-width="3" fill="none"/>
    </svg>
    <div class="logo-text">maternal <span>mind</span></div>
  </div>
  <div class="handle">@maternalmind.es</div>
</div>`;

const BASE_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1080px; height:1920px; overflow:hidden; position:relative; font-family:'DM Sans',sans-serif; }
.header { position:absolute; top:0; left:0; right:0; height:176px; background:rgba(255,255,255,0.97); border-bottom:2px solid rgba(125,207,202,0.22); display:flex; align-items:center; justify-content:space-between; padding:0 72px; z-index:20; }
.logo { display:flex; align-items:center; gap:20px; }
.logo-text { font-family:'DM Sans',sans-serif; font-size:42px; color:#4AADA7; letter-spacing:0.01em; }
.logo-text span { color:#F2C14E; font-weight:500; }
.handle { font-family:'DM Sans',sans-serif; font-size:28px; font-weight:400; color:#8A8A8A; }
.url { position:absolute; bottom:120px; left:50%; transform:translateX(-50%); font-family:'DM Sans',sans-serif; font-size:28px; font-weight:300; color:#5E5E5E; letter-spacing:0.04em; white-space:nowrap; z-index:10; }
.bg-turq { position:absolute; width:900px; height:900px; border-radius:50%; background:radial-gradient(circle,rgba(125,207,202,0.13) 0%,transparent 70%); top:-300px; right:-250px; pointer-events:none; }
.bg-gold { position:absolute; width:700px; height:700px; border-radius:50%; background:radial-gradient(circle,rgba(242,193,78,0.10) 0%,transparent 70%); bottom:-200px; left:-150px; pointer-events:none; }
.content { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:880px; }
.btn { display:inline-block; font-family:'DM Sans',sans-serif; font-size:44px; font-weight:600; color:#4AADA7; letter-spacing:0.02em; }
.btn-gold { display:inline-block; font-family:'DM Sans',sans-serif; font-size:44px; font-weight:600; color:#B8820A; letter-spacing:0.02em; }
.divider { width:120px; height:3px; background:linear-gradient(90deg,#4AADA7,#7DCFCA,#C8EDEB); margin:0 auto; border-radius:2px; }
.divider-gold { width:120px; height:3px; background:linear-gradient(90deg,#B8820A,#F2C14E,#FEF7E0); margin:0 auto; border-radius:2px; }
.label { font-family:'DM Sans',sans-serif; font-size:22px; font-weight:500; letter-spacing:0.2em; text-transform:uppercase; color:#4AADA7; display:flex; align-items:center; justify-content:center; gap:20px; }
.label::before,.label::after { content:''; display:block; width:48px; height:1px; background:#C8EDEB; }
.label-gold { font-family:'DM Sans',sans-serif; font-size:22px; font-weight:500; letter-spacing:0.2em; text-transform:uppercase; color:#B8820A; display:flex; align-items:center; justify-content:center; gap:20px; }
.label-gold::before,.label-gold::after { content:''; display:block; width:48px; height:1px; background:rgba(184,130,10,0.3); }
.badge { display:inline-flex; align-items:center; background:#EEF9F8; color:#4AADA7; border:1px solid rgba(74,173,167,0.25); font-size:22px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase; padding:12px 32px; border-radius:50px; font-family:'DM Sans',sans-serif; }
.badge-gold { display:inline-flex; align-items:center; background:#FEF7E0; color:#B8820A; border:1px solid rgba(184,130,10,0.25); font-size:22px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase; padding:12px 32px; border-radius:50px; font-family:'DM Sans',sans-serif; }
.q { font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#3A3A3A; line-height:1.15; }
.q-turq { font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#4AADA7; line-height:1.15; }
.q-soft { font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#5E5E5E; line-height:1.15; }
.q-gold { font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#B8820A; line-height:1.15; }
.pull { border-left:4px solid #7DCFCA; padding:16px 0 16px 48px; text-align:left; }
.pull-gold { border-left:4px solid #F2C14E; padding:16px 0 16px 48px; text-align:left; }
.sub { font-family:'DM Sans',sans-serif; font-size:34px; font-weight:300; color:#5E5E5E; line-height:1.7; }
.sub-turq { font-family:'DM Sans',sans-serif; font-size:34px; font-weight:300; color:#4AADA7; line-height:1.7; }
.sub-gold { font-family:'DM Sans',sans-serif; font-size:34px; font-weight:300; color:#B8820A; line-height:1.7; }
`;

function html(bg, body, showUrl = true) {
  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Story Maternal Mind</title>
${FONTS}
<style>${BASE_CSS}body{background:${bg};}</style>
</head><body>
<div class="bg-turq"></div>
<div class="bg-gold"></div>
${HEADER}
${body}
${showUrl ? '<div class="url">maternalmind.es</div>' : ''}
</body></html>`;
}

function shot(day, slide) {
  const dir = `${BASE}/dia${day}`;
  fs.mkdirSync(dir, { recursive: true });
  const htmlPath = `${dir}/slide${slide}.html`;
  const pngPath  = `${dir}/dia${day}_slide${slide}.png`;
  try {
    execSync(`"${CHROME}" --headless=new --screenshot="${pngPath}" --window-size=1080,1920 "file://${htmlPath}" 2>/dev/null`, { timeout: 30000 });
    console.log(`✅  dia${day}_slide${slide}.png`);
  } catch(e) {
    console.error(`❌  dia${day}_slide${slide} — ${e.message}`);
  }
}

function write(day, slide, bg, body, showUrl = true) {
  const dir = `${BASE}/dia${day}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/slide${slide}.html`, html(bg, body, showUrl));
}

// ─────────────────────────────────────────
// SEMANA 1 · KIT DE PAUSA
// ─────────────────────────────────────────

// DÍA 2 · Martes 2/6 — La pregunta
write(2, 1, '#FFFFFF', `
<div class="content" style="transform:translate(-50%,-52%);text-align:center;">
  <div class="label" style="margin-bottom:64px;">La pausa</div>
  <div class="q" style="font-size:112px;margin-bottom:64px;">
    "¿Cuándo fue la última vez que paraste de verdad?"
  </div>
  <div class="divider" style="margin-bottom:56px;"></div>
  <div class="sub" style="text-align:center;">No para hacer otra cosa.<br>Solo para estar.</div>
  <div style="margin-top:72px;font-size:64px;">🌿</div>
</div>`);

// DÍA 3 · Miércoles 3/6 — La parte difícil, slide 1 (dolor, sin CTA)
write(3, 1, '#FFFFFF', `
<div style="position:absolute;top:176px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 80px;text-align:center;">
  <div class="label" style="margin-bottom:80px;">La parte difícil</div>
  <div style="display:flex;flex-direction:column;gap:20px;margin-bottom:80px;">
    <div class="q" style="font-size:108px;">"El cansancio."</div>
    <div class="q" style="font-size:108px;">"Las dudas."</div>
    <div class="q" style="font-size:108px;">"El no sé si lo estoy<br>haciendo bien."</div>
  </div>
  <div class="divider" style="margin-bottom:64px;"></div>
  <div class="label">La maternidad tiene esa cara.</div>
</div>`, false);

// DÍA 3 · slide 2 (pivote + solución) — tarjeta turquesa solo para la frase
write(3, 2, '#FDFAF5', `
<div style="position:absolute;top:176px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 64px;gap:72px;text-align:center;">
  <div class="label">Y también tiene otra.</div>
  <div style="background:#EEF9F8;border-radius:40px;padding:80px 72px;">
    <div class="q-turq" style="font-size:108px;">"El Kit de Pausa te ayuda a encontrarla."</div>
  </div>
  <div class="btn">Empieza gratis →</div>
</div>`);

// DÍA 4 · Jueves 4/6 — La parte hermosa
write(4, 1, '#FFFFFF', `
<div style="position:absolute;top:176px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 80px;text-align:center;">
  <div class="label-gold" style="margin-bottom:64px;">La parte hermosa</div>
  <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:56px;">
    <div class="q" style="font-size:80px;">"El olor de su cabeza."</div>
    <div class="q" style="font-size:80px;">"La forma en que te mira."</div>
    <div class="q" style="font-size:80px;">"Ese amor que no sabías<br>que podía existir así."</div>
  </div>
  <div class="divider-gold" style="margin-bottom:56px;"></div>
  <div class="sub" style="text-align:center;font-size:46px;margin-bottom:56px;">
    Para estar dentro de todo eso,<br>hay que aprender a parar.
  </div>
  <div style="font-size:56px;">🌿</div>
</div>`);

// DÍA 5 · Viernes 5/6 — El permiso
write(5, 1, '#FDFAF5', `
<div style="position:absolute;top:176px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 80px 360px;text-align:center;">
  <div class="label" style="margin-bottom:72px;">El permiso</div>
  <div class="q" style="font-size:128px;margin-bottom:48px;">"No necesitas tiempo."</div>
  <div class="divider" style="margin-bottom:48px;"></div>
  <div class="q-turq" style="font-size:128px;margin-bottom:80px;">"Necesitas darte permiso."</div>
  <div class="btn">Empieza aquí →</div>
</div>`);

// DÍA 6 · Sábado 6/6 — Para quién es
write(6, 1, '#FDFAF5', `
<div style="position:absolute;top:176px;left:0;right:0;bottom:0;display:flex;flex-direction:column;justify-content:center;padding:0 80px 200px;">
  <div class="label" style="margin-bottom:72px;">¿Es para ti?</div>
  <div style="display:flex;flex-direction:column;gap:52px;margin-bottom:80px;">
    <div style="display:flex;align-items:flex-start;gap:32px;">
      <div style="width:5px;min-width:5px;height:72px;background:linear-gradient(180deg,#4AADA7,#7DCFCA);border-radius:3px;margin-top:12px;flex-shrink:0;"></div>
      <div class="q" style="font-size:76px;">Para la mamá embarazada que quiere llegar con más calma.</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:32px;">
      <div style="width:5px;min-width:5px;height:72px;background:linear-gradient(180deg,#4AADA7,#7DCFCA);border-radius:3px;margin-top:12px;flex-shrink:0;"></div>
      <div class="q" style="font-size:76px;">Para la del posparto que se ha perdido por el camino.</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:32px;">
      <div style="width:5px;min-width:5px;height:72px;background:linear-gradient(180deg,#4AADA7,#7DCFCA);border-radius:3px;margin-top:12px;flex-shrink:0;"></div>
      <div class="q" style="font-size:76px;">Para la que lleva años y siente que ya toca volver a ella.</div>
    </div>
  </div>
  <div style="text-align:center;"><div class="btn">Accede al Kit de Pausa gratis →</div></div>
</div>`);

// DÍA 7 · Domingo 7/6 — Lo que nadie dice
write(7, 1, '#FFFFFF', `
<div style="position:absolute;top:176px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 80px 160px;text-align:center;">
  <div class="label" style="margin-bottom:72px;">Lo que nadie dice</div>
  <div class="q-soft" style="font-size:84px;margin-bottom:48px;">"La sociedad te felicita y espera que seas perfecta."</div>
  <div class="divider" style="margin-bottom:48px;"></div>
  <div class="q" style="font-size:84px;margin-bottom:64px;">"Nadie te habla de lo que sientes por dentro."</div>
  <div class="q-turq" style="font-size:96px;margin-bottom:72px;">"Maternal Mind es humanidad compartida."</div>
  <div class="q-soft" style="font-size:48px;">— Chon —</div>
</div>`, false);

// DÍA 8 · Lunes 8/6 — Mañana hay más, slide 1 (teaser)
write(8, 1, '#EEF9F8', `
<div class="content" style="transform:translate(-50%,-52%);text-align:center;">
  <div class="label" style="margin-bottom:80px;">Mañana</div>
  <div class="q" style="font-size:152px;margin-bottom:56px;">"Mañana<br>llega algo más."</div>
  <div class="divider" style="margin-bottom:56px;"></div>
  <div class="sub-turq" style="text-align:center;letter-spacing:0.04em;">Quédate cerca. 🌿</div>
</div>`, false);

// DÍA 8 · slide 2 — último aviso Kit de Pausa
write(8, 2, '#FDFAF5', `
<div style="position:absolute;top:176px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 80px 200px;text-align:center;">
  <div class="badge" style="margin-bottom:72px;">Hoy todavía puedes empezar</div>
  <div class="q" style="font-size:120px;margin-bottom:56px;">"Kit de Pausa — gratis."</div>
  <div class="divider" style="margin-bottom:56px;"></div>
  <div class="sub" style="text-align:center;margin-bottom:72px;">5 prácticas para madres que desean<br>vivir su maternidad desde dentro.</div>
  <div class="btn">Empieza gratis →</div>
</div>`);

// ─────────────────────────────────────────
// SEMANA 2 · BIBLIOTECA MAMI
// ─────────────────────────────────────────

// DÍA 9 · Lunes 9/6 — Lanzamiento, slide 1
write(9, 1, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.20) 0%,transparent 65%);pointer-events:none;"></div>
<div class="content" style="transform:translate(-50%,-52%);text-align:center;">
  <div class="q" style="font-size:96px;margin-bottom:32px;">"Ya está aquí."</div>
  <div style="font-family:'DM Sans';font-size:88px;font-weight:500;color:#B8820A;letter-spacing:0.04em;margin-bottom:48px;">Biblioteca MaMi</div>
  <div class="divider-gold" style="margin-bottom:56px;"></div>
  <div class="sub" style="text-align:center;">Para madres que desean vivir<br>su maternidad desde dentro.</div>
</div>`);

// DÍA 9 · slide 2
write(9, 2, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.18) 0%,transparent 65%);pointer-events:none;"></div>
<div class="content" style="transform:translate(-50%,-52%);text-align:center;">
  <div class="label-gold" style="margin-bottom:56px;">Biblioteca Mami</div>
  <div class="pull-gold" style="margin-bottom:72px;">
    <div class="q" style="font-size:92px;">"Todo lo que necesitas para acompañarte en cada etapa."</div>
  </div>
  <div class="btn-gold">Quiero entrar →</div>
</div>`);

// DÍA 10 · Martes 10/6 — Qué hay dentro
write(10, 1, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.15) 0%,transparent 65%);pointer-events:none;"></div>
<div style="position:absolute;top:176px;left:0;right:0;bottom:0;display:flex;flex-direction:column;justify-content:center;padding:0 80px 120px;gap:52px;">

  <div class="label-gold">Dentro de MaMi</div>

  <div style="display:flex;flex-direction:column;gap:32px;">
    ${[['21','prácticas'],['2','nuevas prácticas cada mes'],['1','encuentro mensual<br>para practicar juntas']].map(([n,t])=>`
    <div style="display:flex;align-items:center;gap:36px;">
      <div style="font-family:'DM Sans';font-size:72px;font-weight:700;color:#F2C14E;min-width:72px;text-align:right;line-height:1;">${n}</div>
      <div style="width:2px;min-width:2px;height:64px;background:linear-gradient(180deg,#B8820A,#F2C14E);border-radius:2px;"></div>
      <div class="q" style="font-size:64px;">${t}</div>
    </div>`).join('')}
  </div>

  <div class="divider-gold"></div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
    ${['Meditaciones y audios guiados','Journaling','Microprácticas','Lecturas breves'].map(t=>`
    <div style="font-family:'DM Sans';font-size:26px;font-weight:400;color:#B8820A;background:rgba(242,193,78,0.15);border:1px solid rgba(184,130,10,0.2);padding:14px 24px;border-radius:20px;text-align:center;display:flex;align-items:center;justify-content:center;">${t}</div>`).join('')}
    <div style="grid-column:1/-1;font-family:'DM Sans';font-size:26px;font-weight:400;color:#B8820A;background:rgba(242,193,78,0.15);border:1px solid rgba(184,130,10,0.2);padding:14px 24px;border-radius:20px;text-align:center;">y más…</div>
  </div>

  <div style="font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:300;font-style:italic;color:#B8820A;text-align:center;letter-spacing:0.02em;">Un espacio en crecimiento 🌱</div>

  <div style="text-align:center;"><div class="btn-gold">Entrar a MaMi →</div></div>

</div>`);

// DÍA 11 · Miércoles 11/6 — Por qué una biblioteca
write(11, 1, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.18) 0%,transparent 65%);pointer-events:none;"></div>
<div class="content" style="transform:translate(-50%,-52%);text-align:center;">
  <div class="label-gold" style="margin-bottom:72px;">Por qué una biblioteca</div>
  <div class="q-soft" style="font-size:80px;margin-bottom:56px;">"No es un curso con fecha de fin."</div>
  <div class="divider-gold" style="margin-bottom:56px;"></div>
  <div class="q-gold" style="font-size:108px;margin-bottom:72px;">"Es un acompañamiento que crece contigo."</div>
  <div class="sub" style="text-align:center;">En cada etapa de tu maternidad.</div>
</div>`);

// DÍA 12 · Jueves 12/6 — Para quién es (Biblioteca)
write(12, 1, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.15) 0%,transparent 65%);pointer-events:none;"></div>
<div class="content" style="transform:translate(-50%,-52%);text-align:left;">
  <div style="font-family:'DM Sans';font-size:22px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:#B8820A;margin-bottom:56px;display:flex;align-items:center;gap:20px;">
    <span style="width:48px;height:1px;background:rgba(184,130,10,0.3);display:block;"></span>¿Es para ti?
  </div>
  <div style="display:flex;flex-direction:column;gap:52px;margin-bottom:72px;">
    <div style="display:flex;align-items:flex-start;gap:28px;">
      <div style="width:6px;min-width:6px;height:80px;background:linear-gradient(180deg,#B8820A,#F2C14E);border-radius:3px;margin-top:10px;"></div>
      <div class="q" style="font-size:76px;">Para la mamá que hizo el Kit de Pausa y quiere ir más lejos.</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:28px;">
      <div style="width:6px;min-width:6px;height:80px;background:linear-gradient(180deg,#B8820A,#F2C14E);border-radius:3px;margin-top:10px;"></div>
      <div class="q" style="font-size:76px;">Para la que necesita un lugar al que volver cada día.</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:28px;">
      <div style="width:6px;min-width:6px;height:80px;background:linear-gradient(180deg,#B8820A,#F2C14E);border-radius:3px;margin-top:10px;"></div>
      <div class="q" style="font-size:76px;">Para la que quiere vivir su maternidad de forma más consciente.</div>
    </div>
  </div>
  <div class="btn-gold" style="display:block;text-align:center;">Entrar a la Biblioteca →</div>
</div>`);

// DÍA 13 · Viernes 13/6 — El precio del no, slide 1 (reflexión)
write(13, 1, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.15) 0%,transparent 65%);pointer-events:none;"></div>
<div class="content" style="transform:translate(-50%,-52%);text-align:left;">
  <div class="label-gold" style="margin-bottom:80px;">Una reflexión</div>
  <div class="pull-gold">
    <div class="q" style="font-size:76px;margin-bottom:48px;">"El agotamiento tiene un precio."</div>
    <div class="q" style="font-size:76px;margin-bottom:48px;">"La desconexión también."</div>
    <div class="q-turq" style="font-size:100px;">"Cuidarte no es un lujo."</div>
  </div>
</div>`, false);

// DÍA 13 · slide 2 — permiso económico
write(13, 2, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.18) 0%,transparent 65%);pointer-events:none;"></div>
<div class="content" style="transform:translate(-50%,-52%);text-align:center;">
  <div class="q-turq" style="font-size:120px;font-weight:400;margin-bottom:56px;">"Es lo que te permite seguir siendo tú dentro de la maternidad."</div>
  <div class="divider-gold" style="margin-bottom:56px;"></div>
  <div style="font-family:'DM Sans';font-size:48px;font-weight:600;color:#B8820A;letter-spacing:0.1em;text-transform:uppercase;text-align:center;margin-bottom:72px;">Biblioteca MaMi</div>
  <div class="btn-gold" style="display:block;text-align:center;">Elijo cuidarme →</div>
</div>`);

// DÍA 14 · Sábado 14/6 — Última llamada
write(14, 1, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.20) 0%,transparent 65%);pointer-events:none;"></div>
<div class="content" style="transform:translate(-50%,-52%);text-align:center;">
  <div class="q-turq" style="font-size:136px;font-weight:400;margin-bottom:56px;">"Hoy es un buen día para empezar."</div>
  <div class="divider-gold" style="margin-bottom:56px;"></div>
  <div style="font-family:'DM Sans';font-size:56px;font-weight:600;color:#B8820A;letter-spacing:0.1em;text-transform:uppercase;text-align:center;margin-bottom:72px;">Biblioteca MaMi</div>
  <div class="btn-gold">Entrar ahora →</div>
</div>`);

// DÍA 15 · Domingo 15/6 — Cierre (cálido, sin CTA)
write(15, 1, '#FEF7E0', `
<div style="position:absolute;top:-350px;right:-350px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,0.15) 0%,transparent 65%);pointer-events:none;"></div>
<div class="content" style="transform:translate(-50%,-52%);text-align:center;">
  <div style="margin-bottom:32px;">
    <svg width="120" height="68" viewBox="0 0 52 28" fill="none">
      <ellipse cx="17" cy="14" rx="13" ry="13" stroke="#7DCFCA" stroke-width="3" fill="none"/>
      <ellipse cx="35" cy="14" rx="13" ry="13" stroke="#F2C14E" stroke-width="3" fill="none"/>
    </svg>
  </div>
  <div style="font-family:'DM Sans';font-size:56px;font-weight:600;color:#B8820A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:56px;">Biblioteca MaMi</div>
  <div class="q-turq" style="font-size:108px;font-weight:400;margin-bottom:56px;">"Bienvenidas las que ya estáis dentro."</div>
  <div class="divider-gold" style="margin-bottom:56px;"></div>
  <div class="sub" style="text-align:center;margin-bottom:72px;">A las que aún dudáis:<br>aquí estaré cuando estéis listas.</div>
  <div class="q-gold" style="font-size:52px;">Con todo el cariño del mundo 🌿<br>Chon</div>
</div>`, false);

// ─────────────────────────────────────────
// GENERAR TODOS LOS PNG
// ─────────────────────────────────────────
console.log('\n🌿 Generando imágenes...\n');

const dias = [[15,1]];

for (const [day, slide] of dias) {
  shot(day, slide);
}

console.log('\n✅ Todo listo en Desktop/maternal-mind-stories/');
