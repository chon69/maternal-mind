# Credenciales de Acceso — Maternal Mind App

> **Importante:** Las claves de API y tokens están en `.env.local` (nunca se sube a GitHub).  
> Este archivo sólo contiene URLs, emails y pasos de configuración.

---

## URLs públicas (producción)

| | URL |
|-|-----|
| **Landing** | https://www.maternalmind.es |
| **Login** | https://www.maternalmind.es/app/login.html |
| **Panel Admin** | https://www.maternalmind.es/app/admin/ |
| **Panel Clientas** | https://www.maternalmind.es/app/cliente/ |

> Alojado en Railway — se re-despliega automáticamente al hacer `git push` a la rama `main`.
> El dominio sin `www` (maternalmind.es) redirige al de arriba.

## URLs de staging (pruebas)

| | URL |
|-|-----|
| **Landing** | https://maternal-mind-staging.up.railway.app |
| **Panel Admin** | https://maternal-mind-staging.up.railway.app/app/admin/ |

> Se re-despliega al hacer `git push` a la rama `staging`.
> **Norma:** todo cambio se prueba aquí primero; solo tras el OK pasa a producción.
> Staging tiene su propia base de datos y sus propias usuarias: la contraseña de
> admin puede no ser la misma que en producción.

---

## Arrancar la aplicación en local

```bash
node server.js
```

App disponible en: **http://localhost:3000**

> Trabaja contra la base de datos de **staging**, no contra la real.
> Si tarda mucho en arrancar la primera vez, no está colgada: es iCloud
> sincronizando la carpeta del Escritorio. Dale un par de minutos.

---

## Panel de Administración (Chon)

| Campo       | Valor                          |
|-------------|--------------------------------|
| **URL**     | https://www.maternalmind.es/app/admin/ |
| **Email**   | chon@maternalmind.es           |
| **Contraseña** | La que estableciste con `node setup-admin.js` |
| **Rol**     | admin                          |

> ✅ **Verificado 2026-06-28:** acceso admin restablecido y panel comprobado en producción.
> Login `role=admin` (200) y APIs del dashboard OK: `admin-users` (30 registros),
> `admin-events` (5), `admin-messages` (1). La contraseña se guarda aparte, no en este archivo.

### Restablecer / cambiar contraseña de admin

```bash
node setup-admin.js <nueva-contraseña>
```

### Secciones del panel admin

| Sección         | Función                                              |
|-----------------|------------------------------------------------------|
| Dashboard       | Estadísticas de usuarias registradas                 |
| Contactos       | Importar suscriptoras de Substack e invitarlas al Kit |
| Recursos        | Gestionar prácticas del Kit de Pausa                 |
| Eventos         | Crear y editar talleres, círculos, retiros           |
| Blog            | Escribir y publicar artículos (editor HTML)          |
| Podcast         | Añadir episodios con links Spotify / Apple / iVoox   |
| Biblioteca      | Vista de la base de datos Notion (Biblioteca Mami)   |
| Testimonios     | Añadir/editar testimonios de madres (web + plataforma)|
| Emails          | Plantillas y envío de emails a usuarias              |
| Chat IA         | Asistente inteligente con Groq                       |
| Usuarias        | Gestión de cuentas, activar plan premium             |

---

## Panel de Madres (Clientas)

| Campo       | Valor                                     |
|-------------|-------------------------------------------|
| **Registro** | https://www.maternalmind.es/index.html   |
| **Login**   | https://www.maternalmind.es/app/login.html |
| **Panel**   | https://www.maternalmind.es/app/cliente/  |
| **Email**   | El que cada madre use al registrarse      |
| **Contraseña** | La que cada madre elija al activar su cuenta |

### Flujo de registro de una madre

1. Rellena el formulario en la landing (index.html)
2. Recibe email de activación con enlace único (**no caduca**: el mismo enlace
   sigue siendo válido siempre, para que nadie se quede fuera por tardar)
3. Hace clic en el enlace → elige su contraseña
4. Accede automáticamente a su panel

Al registrarse por el formulario se la suscribe también a la newsletter de
Substack (requiere `SUBSTACK_PUB_URL`; si falla, el registro se completa igual).

### Flujo desde Substack (el funnel empieza ahí)

Substack no tiene API ni webhooks, así que el puente es su export CSV:

1. En Substack: **Dashboard → Subscribers → Export**
2. En **Admin → Contactos**, subir el CSV. Se puede subir el mismo archivo
   tantas veces como haga falta: nadie se duplica.
3. Las nuevas entran con estado `suscriptor` y **no reciben ningún email**.
4. Cuando Chon lo decida, las selecciona y les envía la invitación al Kit.
   Pasan entonces a `pendiente`, igual que un alta por formulario.

> Es un paso manual a propósito: se suscribieron a la newsletter, no a la
> plataforma.

### Secciones del panel cliente

| Sección          | Plan requerido         |
|------------------|------------------------|
| Kit de Pausa     | Gratuito (free)        |
| Eventos          | Gratuito (free)        |
| Blog             | Gratuito (free)        |
| Podcast          | Gratuito (free)        |
| Biblioteca Mami  | Premium (biblioteca_mami) |
| Mi Perfil        | Gratuito (free)        |

### Activar plan premium a una madre (manual)

1. Entrar en **Admin → Usuarias**
2. Buscar la madre por email
3. Editar → campo **Plan** → `biblioteca_mami`

---

## Variables de entorno (.env.local)

| Variable                 | Para qué sirve                                |
|--------------------------|-----------------------------------------------|
| `DATABASE_URL`           | **Base de datos PostgreSQL.** En local apunta a *staging* |
| `SUBSTACK_PUB_URL`       | `https://maternalmind.substack.com` — alta en la newsletter |
| `GOOGLE_CLIENT_ID`       | OAuth Google (Gmail + Drive)                  |
| `GOOGLE_CLIENT_SECRET`   | OAuth Google                                  |
| `GOOGLE_REFRESH_TOKEN`   | Acceso sin caducidad a Google                 |
| `GOOGLE_SPREADSHEET_ID`  | Google Sheet original — solo migración histórica |
| `SENDER_EMAIL`           | Email remitente (chon@maternalmind.es)        |
| `JWT_SECRET`             | Firma de tokens de sesión                     |
| `NOTION_API_KEY`         | API Notion (Biblioteca Mami)                  |
| `GROQ_API_KEY`           | Chat IA del panel admin                       |
| `GROQ_API_KEY_FALLBACK`  | Clave de respaldo para Groq                   |
| `ADMIN_EMAIL`            | Email que se reconoce como admin              |
| `APP_URL`                | URL base (http://localhost:3000 en local)     |
| `GITHUB_TOKEN`/`GITHUB_REPO` | Acceso al repositorio                     |
| `STRIPE_SECRET_KEY`      | Pagos — opcional (503 si falta)               |
| `STRIPE_PRICE_ID`        | Precio suscripción Biblioteca Mami — opcional |
| `STRIPE_WEBHOOK_SECRET`  | Webhook Stripe — opcional                     |

> ⚠️ El `DATABASE_URL` de `.env.local` apunta a **staging**, no a producción.
> La de producción está en el mismo archivo, comentada. El resto de claves
> (Stripe, Gmail) **sí son las reales**: al probar en local, un cobro o un
> email salen de verdad.

---

## Base de datos (PostgreSQL en Railway)

Cada entorno tiene la suya, independiente: producción y staging **no comparten datos**.
Las credenciales están en las variables del servicio Postgres de cada entorno en Railway.

| Tabla       | Contenido                                              |
|-------------|--------------------------------------------------------|
| usuarios    | Registro de contactos: cuentas, contraseñas (hash), roles, planes, origen |
| leads       | Registro de cada envío del formulario de la landing     |
| recursos    | Prácticas del Kit de Pausa (campo premium)             |
| eventos     | Talleres, círculos, retiros                            |
| articulos   | Blog (título, contenido HTML, categoría)               |
| podcast     | Episodios + links plataformas                          |
| comunidad   | Publicaciones de las madres                            |
| mensajes    | Mensajes de clientas y sus respuestas                  |
| testimonios | Testimonios (web + plataforma)                         |
| plantillas  | Plantillas de email                                    |

### Estados de un contacto (`usuarios.estado`)

| Estado       | Significa                                                  |
|--------------|------------------------------------------------------------|
| `suscriptor` | Está en la newsletter, aún no se le ha invitado. No puede entrar |
| `pendiente`  | Invitada: tiene su email de acceso, aún no ha elegido contraseña |
| `activo`     | Cuenta activa, puede entrar                                |
| `inactivo`   | Desactivada a mano desde el admin                          |

Y `usuarios.origen` dice de dónde vino: `web` (formulario propio) o `substack`.

### Aplicar cambios de estructura

```bash
node db/apply-schema.js .env.staging   # primero staging
node db/apply-schema.js                # producción (usa .env.local; descomentar antes la URL de producción)
```

Es idempotente: se puede ejecutar las veces que haga falta.

> El Google Sheet original (`10ucqdwcLjuNL4K6Fv565nhQMXtPR5oE8QsXhKrdAaXw`) ya
> **no es la base de datos**. Se conserva como red de seguridad histórica de
> antes de la migración. `db/migrate.js` es el script que trajo aquellos datos.
