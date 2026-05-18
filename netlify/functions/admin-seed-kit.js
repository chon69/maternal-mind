const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, append } = require('../lib/sheets');

const MODULE_NAME = 'Prácticas esenciales';

const PRACTICES = [
  {
    titulo: 'Volver en 3 minutos',
    descripcion: 'Una meditación guiada para cuando todo va demasiado rápido. Puedes hacerla sentada o de pie, donde estés.',
    tipo: 'audio',
    modulo: '1',
    modulo_nombre: MODULE_NAME,
    orden: '1',
    contenido: 'Encuentra un momento solo para ti. Puede ser sentada o de pie. Donde estés.\n\nColoca la espalda recta, pero sin tensión. Suave. Baja los hombros... y permite que las escápulas se acerquen un poco entre sí.\n\nLleva ahora tu atención a la respiración. Sin cambiar nada. Solo observar. Nota el camino que hace el aire al entrar por las fosas nasales... cómo llega hasta el abdomen... y cómo vuelve a salir.\n\nCuando estés lista... toma una respiración un poco más profunda... y, al soltar... abre los ojos suavemente. Aquí sigues. Aquí estás.\n\n💛 Frase semilla: "No tengo que hacer nada bien. Solo respirar."',
    url_archivo: 'volver-3-minutos.mp3',
    duracion: '3 min',
  },
  {
    titulo: 'El Tacto Tranquilizador',
    descripcion: 'Colocar una mano sobre tu cuerpo de forma consciente y amable. El contacto físico suave activa el sistema nervioso parasimpático. Para cuando estás desbordada.',
    tipo: 'audio',
    modulo: '1',
    modulo_nombre: MODULE_NAME,
    orden: '2',
    contenido: 'El tacto tranquilizador es un gesto simple y poderoso: colocar una mano sobre tu cuerpo de forma consciente y amable.\n\n¿Por qué funciona? El contacto físico suave activa el sistema nervioso parasimpático — el que nos calma y nos regula. Es la misma respuesta que siente un bebé cuando lo coges en brazos.\n\nGestos posibles:\n· Mano en el pecho, sobre el corazón\n· Mano en el vientre\n· Una mano sobre la otra, en el regazo\n· Mano en la mejilla\n· Brazos cruzados, dándote un abrazo suave\n\n💛 Frase semilla: "No necesito condiciones perfectas. Solo mi mano... y mi intención."',
    url_archivo: 'mano-en-el-pecho.mp3',
    duracion: '3–5 min',
  },
  {
    titulo: 'Presencia en el contacto',
    descripcion: 'Para cuando estás con tu bebé y quieres estar de verdad. Puedes hacerla mientras lo amamantas, bañas, portas o tienes en brazos.',
    tipo: 'audio',
    modulo: '1',
    modulo_nombre: MODULE_NAME,
    orden: '3',
    contenido: 'Esta práctica puedes hacerla en cualquier momento en que estés en contacto con tu bebé. Mientras lo amamantas. Mientras lo bañas. Mientras lo portas. Mientras simplemente lo tienes en brazos.\n\nNo necesitas parar lo que estás haciendo. Solo traer tu atención... aquí.\n\nNota cómo está tu cuerpo ahora mismo. Tus pies en el suelo. Tu espalda. Tu respiración.\n\nY ahora lleva la atención al punto de contacto con tu bebé. ¿Dónde se toca vuestra piel? Sus manos. Su cabeza. Su espalda. Su peso sobre ti.\n\nSiente la temperatura. Su peso. Ese peso tan suyo. Que solo existe aquí, en este momento, contigo.\n\n💛 Frase semilla: "No necesito ir a ningún sitio. Todo está aquí, en este contacto."',
    url_archivo: 'presencia-contacto.mp3',
    duracion: '4–5 min',
  },
  {
    titulo: '¿Qué necesito ahora?',
    descripcion: 'Una práctica de journaling para cuando necesitas escucharte de verdad. Cuatro preguntas para abrir tu libro sagrado interior.',
    tipo: 'journaling',
    modulo: '1',
    modulo_nombre: MODULE_NAME,
    orden: '4',
    contenido: 'Para cuando necesitas escucharte de verdad.\n\nPreguntas para el journaling:\n\n🌿 Pregunta 1\nCierra los ojos un momento. Lleva una mano al pecho. ¿Qué necesito ahora mismo? Escribe lo primero que aparezca. Sin censurarlo.\n\n🌿 Pregunta 2\n¿Hay algo que llevas tiempo sintiendo y no te has permitido escuchar del todo?\n\n🌿 Pregunta 3\n¿Qué página de tu libro sagrado estás viviendo ahora mismo? ¿Cómo quieres leerla?\n\n🌿 Pregunta 4\n¿Qué necesitas darte hoy? Aunque sea pequeño. Aunque sea solo un momento.\n\n💛 Frase semilla: "Todo lo que necesito saber ya está dentro de mí. Solo necesito parar a leerlo."',
    url_archivo: '',
    duracion: '10–15 min',
  },
  {
    titulo: 'Micro momentos bonitos',
    descripcion: 'Para entrenar los ojos a ver lo que hay de bello en lo cotidiano. No necesita que te sientes ni que cierres los ojos.',
    tipo: 'practica',
    modulo: '1',
    modulo_nombre: MODULE_NAME,
    orden: '5',
    contenido: 'Esta práctica no necesita que te sientes. No necesita que cierres los ojos. Solo necesita que mires un poco diferente.\n\nHoy, en algún momento del día... para. Solo un instante. Y busca algo bello en lo que tienes delante.\n\nNo tiene que ser extraordinario. Puede ser:\n· La luz que entra por la ventana\n· La textura de la manta de tu bebé\n· Sus dedos pequeñísimos\n· El sonido de su respiración\n· El olor del champú\n· El color de algo cotidiano\n\nCuando lo encuentres... no lo anotes. No lo fotografíes. Solo quédate con ello unos segundos. Con toda tu atención. Dejando que entre.\n\nPuedes hacerlo una vez. O tres. O cada vez que recuerdes.\n\n💛 Frase semilla: "La belleza no está lejos. Solo necesita que la mire."',
    url_archivo: '',
    duracion: '3–4 min',
  },
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    const existing = await getAll('Recursos');
    const existingTitles = new Set(existing.map(r => r.titulo.trim().toLowerCase()));

    let added = 0;
    for (const p of PRACTICES) {
      if (existingTitles.has(p.titulo.trim().toLowerCase())) continue;
      await append('Recursos', {
        id: crypto.randomUUID(),
        ...p,
        activo: 'TRUE',
        created_at: new Date().toISOString(),
      });
      added++;
    }

    return ok({ added, skipped: PRACTICES.length - added });
  } catch (err) {
    console.error(err);
    return fail(err.message || 'Error al importar', 500);
  }
};
