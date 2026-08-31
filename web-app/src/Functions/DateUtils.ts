// Utilidades de fecha para el DateField y para todo lo que muestre fechas en formato
// argentino. Todo trabaja en hora LOCAL: una fecha de nacimiento es un día del calendario,
// no un instante, y parsear 'yyyy-MM-dd' con `new Date(...)` lo interpreta como UTC
// medianoche — en UTC-3 eso corre la fecha un día para atrás.

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Iniciales de lunes a domingo, en el orden en que se muestra la grilla. */
export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Parsea una marca de tiempo del API (un instante, no un día del calendario).
 *
 * El backend guarda UTC en columnas `timestamp without time zone` (ver
 * Npgsql.EnableLegacyTimestampBehavior en Program.cs), así que serializa sin la `Z` final.
 * `new Date('2026-08-31T01:30:00')` lo interpreta como hora LOCAL, y en UTC-3 eso muestra
 * una evolución creada a las 22:30 del 30 como si fuera del 31. Acá se le agrega la `Z`
 * cuando no trae zona, para que el instante se lea como lo que es.
 */
export const parseApiTimestamp = (value: string): Date => {
  const tieneZona = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(tieneZona ? value : `${value}Z`);
};

/**
 * Normaliza a un Date en medianoche local, o null.
 *
 * Acepta string porque varias pantallas traen la fecha cruda del API tipada como `Date`
 * mediante un cast (por ejemplo Patients.tsx), así que en runtime puede ser un ISO string.
 */
export const toLocalDate = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  // 'yyyy-MM-dd' o 'yyyy-MM-ddTHH:mm:ss…': se toma la parte de fecha tal cual viene y se
  // construye local, sin pasar por el parser de UTC.
  const isoDatePart = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoDatePart) {
    const [, year, month, day] = isoDatePart;
    return buildDate(Number(day), Number(month), Number(year));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

/** Date → 'dd/mm/aaaa'. Cadena vacía si no hay fecha. */
export const toDisplay = (value: Date | string | null | undefined): string => {
  const date = toLocalDate(value);
  if (!date) return '';

  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getFullYear()),
  ].join('/');
};

/**
 * Construye un Date local validando que el día exista de verdad en ese mes: `new Date`
 * acepta 31/02 y lo corre al 3 de marzo en silencio.
 */
const buildDate = (day: number, month: number, year: number): Date | null => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

/** 'dd/mm/aaaa' → Date local, o null si no es una fecha válida y completa. */
export const parseDisplay = (text: string): Date | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;

  const [, day, month, year] = match;
  return buildDate(Number(day), Number(month), Number(year));
};

/** Máscara de tipeo: deja solo dígitos e inserta las barras solo. */
export const maskDisplay = (text: string): string => {
  const digits = text.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const isSameDay = (a: Date | null, b: Date | null): boolean =>
  a !== null && b !== null &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Medianoche local de hoy. */
export const today = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/**
 * Días a mostrar en la grilla del mes, empezando en lunes. Devuelve siempre semanas
 * completas, con los días de relleno del mes anterior y siguiente marcados.
 */
export const buildMonthGrid = (year: number, month: number): { date: Date; inMonth: boolean }[] => {
  const firstOfMonth = new Date(year, month, 1);
  // getDay() es 0=domingo; se convierte a 0=lunes.
  const leading = (firstOfMonth.getDay() + 6) % 7;

  const start = new Date(year, month, 1 - leading);
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ date, inMonth: date.getMonth() === month });

    // Cortar en la última semana que todavía toca el mes: 5 semanas alcanzan salvo
    // los meses que arrancan tarde y necesitan 6.
    if (i >= 27 && (i + 1) % 7 === 0) {
      const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i + 1);
      if (next.getMonth() !== month) break;
    }
  }

  return cells;
};
