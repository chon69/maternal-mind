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
| Recursos        | Gestionar prácticas del Kit de Pausa (Sheets)        |
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
| **Registro** | http://localhost:3000/index.html         |
| **Login**   | http://localhost:3000/app/login.html      |
| **Panel**   | http://localhost:3000/app/cliente/        |
| **Email**   | El que cada madre use al registrarse      |
| **Contraseña** | La que cada madre elija al activar su cuenta |

### Flujo de registro de una madre

1. Rellena el formulario en la landing (index.html)
2. Recibe email de activación con enlace único (válido 72 h)
3. Hace clic en el enlace → elige su contraseña
4. Accede automáticamente a su panel

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
| `GOOGLE_CLIENT_ID`       | OAuth Google (Sheets + Gmail)                 |
| `GOOGLE_CLIENT_SECRET`   | OAuth Google                                  |
| `GOOGLE_REFRESH_TOKEN`   | Acceso sin caducidad a Google                 |
| `GOOGLE_SPREADSHEET_ID`  | ID del Google Sheet (base de datos)           |
| `SENDER_EMAIL`           | Email remitente (chon@maternalmind.es)        |
| `JWT_SECRET`             | Firma de tokens de sesión                     |
| `NOTION_API_KEY`         | API Notion (Biblioteca Mami)                  |
| `GROQ_API_KEY`           | Chat IA del panel admin                       |
| `GROQ_API_KEY_FALLBACK`  | Clave de respaldo para Groq                   |
| `ADMIN_EMAIL`            | Email que se reconoce como admin              |
| `APP_URL`                | URL base (http://localhost:3000 en local)     |
| `STRIPE_SECRET_KEY`      | Pagos — opcional (503 si falta)               |
| `STRIPE_PRICE_ID`        | Precio suscripción Biblioteca Mami — opcional |
| `STRIPE_WEBHOOK_SECRET`  | Webhook Stripe — opcional                     |

---

## Google Sheet (base de datos)

**ID:** `10ucqdwcLjuNL4K6Fv565nhQMXtPR5oE8QsXhKrdAaXw`

| Hoja        | Contenido                                      |
|-------------|------------------------------------------------|
| Usuarios    | Cuentas, contraseñas (hash), roles, planes     |
| Recursos    | Prácticas Kit de Pausa (campo premium TRUE/FALSE) |
| Eventos     | Talleres, círculos, retiros                    |
| Articulos   | Blog (título, contenido HTML, categoría)       |
| Podcast     | Episodios + links plataformas                  |
| Formularios | Registros del formulario de la landing         |
