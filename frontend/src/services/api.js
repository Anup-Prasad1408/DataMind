const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error('Cannot reach the DataMind backend. Start FastAPI or check VITE_API_URL.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail;
    throw new Error(typeof detail === 'string' ? detail : 'The request could not be completed.');
  }
  return payload;
}

export const getHealth = () => request('/api/health');

export const transformText = (body) => request('/api/transform', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const transformFile = (file, settings) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(settings).forEach(([key, value]) => form.append(key, value));
  return request('/api/transform/file', { method: 'POST', body: form });
};

export const refineResult = (body) => request('/api/refine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
