import logger, { describeError } from '../lib/logger';

const BASE = import.meta.env.VITE_API_URL;
const REFRESH_PATH = '/api/AuthService/Refresh';
const CORRELATION_HEADER = 'X-Correlation-Id';

/**
 * Error de API que conserva el status y el cuerpo de la respuesta. Antes los helpers
 * tiraban `new Error('HTTP 400')` y descartaban el body, así que los slugs que manda
 * el backend en el ModelState (doctor_exists, incorrect_code, …) nunca llegaban a la UI.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** Slug del ModelState del backend, si vino uno. */
  readonly slug?: string;
  readonly correlationId?: string;

  constructor(status: number, body: unknown, correlationId?: string) {
    const slug = extractSlug(body);
    super(slug ? `HTTP ${status}: ${slug}` : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.slug = slug;
    this.correlationId = correlationId;
  }
}

// El backend manda el slug en el ModelState, y ASP.NET lo serializa de dos formas según
// el camino: BadRequest(ModelState) explícito da un SerializableError plano
// ({ error: ["incorrect_code"] }) y la validación automática del [ApiController] da un
// ValidationProblemDetails anidado ({ errors: { error: [...] } }). Se contemplan las dos.
const extractSlug = (body: unknown): string | undefined => {
  if (!body || typeof body !== 'object') return undefined;

  const nested = (body as { errors?: unknown }).errors;
  const bag = (nested && typeof nested === 'object' ? nested : body) as Record<string, unknown>;

  // La clave que usan los controllers es "error"; el resto se mira como respaldo.
  const preferred = bag['error'];
  const candidates = Array.isArray(preferred) ? preferred : Object.values(bag).flat();

  const first = candidates.find((value) => typeof value === 'string' && value.length > 0);
  return typeof first === 'string' ? first : undefined;
};

// El cuerpo de error puede no ser JSON (por ejemplo un 502 del proxy). Nunca debe
// romper el manejo del error original.
const readBody = async (res: Response): Promise<unknown> => {
  try {
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
};

const toApiError = async (res: Response, path: string, method: string, ms: number) => {
  const body = await readBody(res);
  const correlationId = res.headers.get(CORRELATION_HEADER) ?? undefined;

  logger.warn('Request fallida', {
    method,
    path,
    status: res.status,
    ms: Math.round(ms),
    correlationId,
    slug: extractSlug(body),
  });

  return new ApiError(res.status, body, correlationId);
};

// Deduplicate concurrent refresh attempts: if several requests 401 at once,
// they all await the same in-flight refresh call.
let refreshPromise: Promise<boolean> | null = null;

const tryRefresh = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}${REFRESH_PATH}`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

/**
 * Handler que corre cuando la sesión murió y el refresh tampoco sirvió. Lo registra
 * AuthBootstrap para poder limpiar Redux y navegar con el router; sin registrar, cae al
 * fallback de recarga completa (que también sirve, porque el store se rehidrata vacío).
 */
type AuthFailureHandler = () => void;
let authFailureHandler: AuthFailureHandler | null = null;

export const setAuthFailureHandler = (handler: AuthFailureHandler | null) => {
  authFailureHandler = handler;
};

const handleAuthFailure = () => {
  localStorage.removeItem('Professional');
  logger.info('Sesión expirada: se limpió el estado local');

  if (authFailureHandler) {
    authFailureHandler();
    return;
  }

  // Fallback sin handler registrado. Ojo: '/' también renderiza el Login, por eso
  // ambos caminos cuentan como "ya estoy en el login".
  const path = window.location.pathname;
  if (path !== '/Login' && path !== '/') {
    window.location.href = '/Login';
  }
};

export interface ApiFetchOptions {
  /**
   * Si la sesión no se puede recuperar, ¿hay que expulsar al usuario al Login?
   * AuthBootstrap lo pone en false: durante el arranque un 401 es un resultado
   * esperado (sesión vencida) y se resuelve marcando la sesión como anónima, no
   * redirigiendo en medio del bootstrap.
   */
  redirectOnAuthFailure?: boolean;
}

// Base wrapper: always sends cookies (credentials: 'include'). On a 401 it tries a
// single token refresh and retries the original request once; if that fails, it clears
// the session and redirects to Login.
export const apiFetch = async (
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions,
): Promise<Response> => {
  const opts: RequestInit = { ...init, credentials: 'include' };
  const method = init?.method ?? 'GET';
  const startedAt = performance.now();

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, opts);
  } catch (error) {
    logger.error('Error de red', {
      method,
      path,
      ms: Math.round(performance.now() - startedAt),
      ...describeError(error),
    });
    throw error;
  }

  if (res.status === 401 && path !== REFRESH_PATH) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(`${BASE}${path}`, opts);
    } else if (options?.redirectOnAuthFailure !== false) {
      handleAuthFailure();
    }
  }

  return res;
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const startedAt = performance.now();
  const res = await apiFetch(path);
  if (!res.ok) throw await toApiError(res, path, 'GET', performance.now() - startedAt);
  return res.json() as Promise<T>;
};

export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  const startedAt = performance.now();
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res, path, 'POST', performance.now() - startedAt);
  return res.json() as Promise<T>;
};

export const apiPatch = async (path: string, body: unknown): Promise<void> => {
  const startedAt = performance.now();
  const res = await apiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res, path, 'PATCH', performance.now() - startedAt);
};

export const apiDelete = async (path: string): Promise<void> => {
  const startedAt = performance.now();
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw await toApiError(res, path, 'DELETE', performance.now() - startedAt);
};

// Sin Content-Type manual: el browser pone el boundary correcto para multipart/form-data
export const apiPostFile = async <T>(path: string, formData: FormData): Promise<T> => {
  const startedAt = performance.now();
  const res = await apiFetch(path, { method: 'POST', body: formData });
  if (!res.ok) throw await toApiError(res, path, 'POST', performance.now() - startedAt);
  return res.json() as Promise<T>;
};

// Descarga binaria (adjuntos). Va por apiFetch para heredar cookies y el retry del 401.
export const apiGetBlob = async (path: string): Promise<Blob> => {
  const startedAt = performance.now();
  const res = await apiFetch(path);
  if (!res.ok) throw await toApiError(res, path, 'GET', performance.now() - startedAt);
  return res.blob();
};
