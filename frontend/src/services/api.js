const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch (error) {
    throw new Error('Cannot reach DataMind API. Check the backend URL, Render status and CORS settings.');
  }

  let payload = {};
  try { payload = await response.json(); } catch { /* non-JSON server response */ }
  if (!response.ok) {
    const message = typeof payload.detail === 'string'
      ? payload.detail
      : `Request failed (${response.status}). Please try again.`;
    throw new Error(message);
  }
  if (!payload || typeof payload !== 'object') throw new Error('Backend returned an invalid response.');
  return payload;
}

export const getHealth = () => request('/api/health');
export const transformText = (body) => request('/api/transform', { method: 'POST', body: JSON.stringify(body) });

export function transformFile(file, settings) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(settings).forEach(([key, value]) => form.append(key, String(value)));
  return request('/api/transform/file', { method: 'POST', body: form });
}

export const refineResult = (body) => request('/api/refine', { method: 'POST', body: JSON.stringify(body) });
