const apiBaseUrl = (import.meta.env.PROD ? '' : import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

export async function parseApiResponse(response, fallback = 'The request could not be completed.') {
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message;
    const makeHttpError = (message) => {
      const error = new Error(message);
      error.status = response.status;
      error.code = payload?.error?.code;
      return error;
    };
    if (response.status === 401) {
      throw makeHttpError(`Authentication failed (HTTP 401): ${detail || 'sign in again to continue.'}`);
    }
    if (response.status === 403) {
      throw makeHttpError(`This action is not permitted (HTTP 403): ${detail || 'check your account access.'}`);
    }
    if (response.status >= 500) {
      const hint = response.status === 502 || response.status === 503
        ? ' Confirm the API server and its database/storage services are available.'
        : '';
      throw makeHttpError(`The API server returned an error (HTTP ${response.status}): ${detail || fallback}${hint}`);
    }
    throw makeHttpError(`The request was rejected (HTTP ${response.status}): ${detail || fallback}`);
  }

  return payload;
}

export function apiNetworkError(error, fallback = 'The API could not be reached.') {
  if (error?.name === 'AbortError') return error;
  if (error instanceof TypeError) {
    return new Error('Network connection failed. Check that the backend is running and the API URL or Vite proxy is correct.');
  }
  return error instanceof Error ? error : new Error(fallback);
}
