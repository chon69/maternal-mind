const MM = (() => {
  const KEY = 'mm_token';
  const USER = 'mm_user';

  function getToken() { return localStorage.getItem(KEY); }
  function setToken(t) { localStorage.setItem(KEY, t); }
  function getUser()  {
    try { return JSON.parse(localStorage.getItem(USER) || 'null'); } catch { return null; }
  }
  function setUser(u) { localStorage.setItem(USER, JSON.stringify(u)); }

  function logout() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(USER);
    window.location.href = '/app/login.html';
  }

  function requireAuth(role) {
    const token = getToken();
    const user  = getUser();
    if (!token || !user) { window.location.href = '/app/login.html'; return null; }
    // Admins can visit any page (client or admin)
    if (role && user.role !== role && user.role !== 'admin') {
      window.location.href = '/app/cliente/';
      return null;
    }
    return user;
  }

  async function api(path, options = {}) {
    const token = getToken();
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) { logout(); return; }
    return res;
  }

  return { getToken, setToken, getUser, setUser, logout, requireAuth, api };
})();
