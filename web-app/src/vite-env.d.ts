/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Minutos de inactividad antes de cerrar la sesión. Opcional (120); igual que Session__IdleTimeoutMinutes del API. */
  readonly VITE_SESSION_IDLE_MINUTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
