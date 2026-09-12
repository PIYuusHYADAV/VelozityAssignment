const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
let accessToken = '';
export const setToken = (token: string) => { accessToken = token; };
export const getToken = () => accessToken;
export async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers); if (options.body) headers.set('Content-Type', 'application/json'); if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  let response = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 401 && path !== '/api/auth/refresh') {
    const refresh = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refresh.ok) { const data = await refresh.json(); accessToken = data.accessToken; headers.set('Authorization', `Bearer ${accessToken}`); response = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include' }); }
  }
  return response;
}
export { API };
