/* Shared admin sidebar — auto-injects into <aside id="sidebar"> */
(function () {
  const ICONS = {
    dashboard: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    leaf: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
    calendar: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    book: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    mail: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    chat: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    users: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    blog: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    mic: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  };

  const NAV = [
    { section: 'Principal' },
    { href: '/app/admin/',               icon: 'dashboard', label: 'Dashboard',    match: ['/app/admin/', '/app/admin/index.html'] },
    { section: 'Contenido' },
    { href: '/app/admin/recursos.html',  icon: 'leaf',      label: 'Recursos',     match: ['/app/admin/recursos.html'] },
    { href: '/app/admin/eventos.html',   icon: 'calendar',  label: 'Eventos',      match: ['/app/admin/eventos.html'] },
    { href: '/app/admin/blog.html',      icon: 'blog',      label: 'Blog',         match: ['/app/admin/blog.html'] },
    { href: '/app/admin/podcast.html',   icon: 'mic',       label: 'Podcast',      match: ['/app/admin/podcast.html'] },
    { href: '/app/admin/biblioteca.html',icon: 'book',      label: 'Biblioteca Notion', match: ['/app/admin/biblioteca.html'] },
    { section: 'Comunicación' },
    { href: '/app/admin/emails.html',    icon: 'mail',      label: 'Emails',       match: ['/app/admin/emails.html'] },
    { href: '/app/admin/chat.html',      icon: 'chat',      label: 'Chat IA',      match: ['/app/admin/chat.html'] },
    { section: 'Gestión' },
    { href: '/app/admin/usuarios.html',  icon: 'users',     label: 'Usuarias',     match: ['/app/admin/usuarios.html'] },
  ];

  const path = window.location.pathname;

  function isActive(item) {
    if (!item.match) return false;
    return item.match.some(m => path === m || path === m.replace(/\.html$/, ''));
  }

  const navHtml = NAV.map(item => {
    if (item.section) return `<div class="nav-section">${item.section}</div>`;
    const active = isActive(item) ? ' active' : '';
    return `<a href="${item.href}" class="nav-item${active}">${ICONS[item.icon]}<span>${item.label}</span></a>`;
  }).join('');

  const html = `
    <a href="/app/admin/" class="sidebar-logo">
      <svg width="28" height="16" viewBox="0 0 52 28" fill="none">
        <ellipse cx="17" cy="14" rx="13" ry="13" stroke="#7DCFCA" stroke-width="3" fill="none"/>
        <ellipse cx="35" cy="14" rx="13" ry="13" stroke="#F2C14E" stroke-width="3" fill="none"/>
      </svg>
      <div class="logo-text">maternal <span>mind</span></div>
    </a>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user"></div>
      <button class="btn-logout" onclick="MM.logout()">Cerrar sesión</button>
    </div>`;

  function inject() {
    const el = document.getElementById('sidebar');
    if (el) {
      el.innerHTML = html;
      // Show username
      const user = MM.getUser();
      if (user) {
        const u = document.getElementById('sidebar-user');
        if (u) u.textContent = user.nombre.split(' ')[0];
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
