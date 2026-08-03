// Logger central del front. Reemplaza los console.log/console.error sueltos.
//
// Todo queda en el navegador a propósito: no se envía nada al API. Mandar logs de
// cliente implicaría un endpoint anónimo de escritura (superficie de abuso) y más
// requests facturadas en Railway, y lo que se necesita para diagnosticar un problema
// puntual se resuelve pidiéndole al usuario el contenido de window.__haLogs.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const BUFFER_SIZE = 50;
const buffer: LogEntry[] = [];

// En producción el ruido informativo no aporta y sí puede filtrar datos del paciente
// a la consola; solo pasan warn y error.
const MIN_LEVEL: LogLevel = import.meta.env.PROD ? 'warn' : 'debug';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const CONSOLE_METHOD: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

const record = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  };

  // Ring buffer: las últimas BUFFER_SIZE entradas quedan disponibles para soporte
  // aunque no se hayan impreso por nivel.
  buffer.push(entry);
  if (buffer.length > BUFFER_SIZE) {
    buffer.shift();
  }

  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const prefix = `[${level.toUpperCase()}] ${message}`;
  if (context) {
    console[CONSOLE_METHOD[level]](prefix, context);
  } else {
    console[CONSOLE_METHOD[level]](prefix);
  }
};

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => record('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => record('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => record('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => record('error', message, context),
  /** Copia del buffer, de más viejo a más nuevo. */
  history: (): LogEntry[] => [...buffer],
};

/** Normaliza un unknown de catch a algo serializable para el campo context. */
export const describeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
};

// Handlers globales: sin esto, una promesa rechazada sin catch o un error fuera del
// árbol de React desaparecen sin dejar rastro.
export const setupGlobalErrorHandlers = () => {
  window.addEventListener('error', (event) => {
    logger.error('Error no manejado', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      ...describeError(event.error),
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Promesa rechazada sin manejar', describeError(event.reason));
  });

  // Punto de entrada para soporte: "abrí la consola y pegame window.__haLogs".
  (window as unknown as { __haLogs: () => LogEntry[] }).__haLogs = logger.history;
};

export default logger;
