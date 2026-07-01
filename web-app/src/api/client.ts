const BASE = import.meta.env.VITE_API_URL;

export const apiFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${BASE}${path}`, init);

export const apiGet = async <T>(path: string): Promise<T> => {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
};

export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
};

export const apiPatch = async (path: string, body: unknown): Promise<void> => {
  const res = await apiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
};

export const apiDelete = async (path: string): Promise<void> => {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
};

// Sin Content-Type manual: el browser pone el boundary correcto para multipart/form-data
export const apiPostFile = async <T>(path: string, formData: FormData): Promise<T> => {
  const res = await apiFetch(path, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
};
