const API_BASE = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(
      `${API_BASE}${path}`,
      options
    );
  } catch (error) {
    throw new Error(
      'Cannot reach the DataMind backend. Check the API URL and backend status.'
    );
  }

  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    let message =
      'The request could not be completed.';

    if (
      typeof payload.detail === 'string'
    ) {
      message = payload.detail;
    }

    throw new Error(message);
  }

  if (
    !payload ||
    typeof payload !== 'object'
  ) {
    throw new Error(
      'The backend returned an invalid response.'
    );
  }

  return payload;
}


export const getHealth = () =>
  request('/api/health');


export const transformText = (
  body
) =>
  request('/api/transform', {
    method: 'POST',

    headers: {
      'Content-Type':
        'application/json',
    },

    body: JSON.stringify(body),
  });


export const transformFile = (
  file,
  settings
) => {

  const form =
    new FormData();

  form.append(
    'file',
    file
  );

  Object.entries(
    settings
  ).forEach(
    ([key, value]) => {
      form.append(
        key,
        value
      );
    }
  );

  return request(
    '/api/transform/file',
    {
      method: 'POST',
      body: form,
    }
  );
};


export const refineResult = (
  body
) =>
  request('/api/refine', {
    method: 'POST',

    headers: {
      'Content-Type':
        'application/json',
    },

    body: JSON.stringify(body),
  });
