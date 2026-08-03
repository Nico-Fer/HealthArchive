import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaRegCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import {
  MONTH_NAMES,
  WEEKDAY_INITIALS,
  buildMonthGrid,
  isSameDay,
  maskDisplay,
  parseDisplay,
  toDisplay,
  toLocalDate,
  today as todayLocal,
} from '../../Functions/DateUtils';
import useClickOutside from '../../hooks/useClickOutside';

import './DateField.scss';

export interface DateFieldProps {
  id: string;
  label?: string;
  /** Acepta string porque varias pantallas traen la fecha del API tipada como Date por un cast. */
  value: Date | string | null;
  onChange: (date: Date | null) => void;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
}

const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT = 340;
const GUTTER = 8;

const clampToRange = (date: Date, min?: Date, max?: Date) => {
  if (min && date < min) return false;
  if (max && date > max) return false;
  return true;
};

const DateField: React.FC<DateFieldProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  minDate,
  maxDate,
  placeholder = 'dd/mm/aaaa',
  disabled = false,
}) => {
  const selected = useMemo(() => toLocalDate(value), [value]);

  const [text, setText] = useState(() => toDisplay(value));
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusedDayRef = useRef<HTMLButtonElement>(null);
  const isTypingRef = useRef(false);

  // El mes que muestra la grilla arranca en la fecha elegida; si no hay, en el borde
  // superior permitido (para fecha de nacimiento eso es hoy) y no en un mes cualquiera.
  const anchorDate = selected ?? maxDate ?? todayLocal();
  const [view, setView] = useState({ year: anchorDate.getFullYear(), month: anchorDate.getMonth() });
  const [focusedDate, setFocusedDate] = useState<Date>(anchorDate);

  // El valor puede cambiar desde afuera (carga del paciente, reset del form). No se pisa
  // mientras el usuario tipea, porque el texto intermedio todavía no es una fecha válida.
  useEffect(() => {
    if (isTypingRef.current) return;
    setText(toDisplay(value));
  }, [value]);

  const minYear = minDate?.getFullYear() ?? 1900;
  const maxYear = maxDate?.getFullYear() ?? todayLocal().getFullYear() + 10;
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [minYear, maxYear],
  );

  const closePopover = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) inputRef.current?.focus();
  }, []);

  useClickOutside([wrapperRef, popoverRef], () => closePopover(), open);

  // Posición: fixed calculado a mano en vez de absolute, porque el modal de Editar
  // Paciente tiene overflow-y: auto y recortaría cualquier hijo posicionado.
  const updatePosition = useCallback(() => {
    const anchor = wrapperRef.current?.getBoundingClientRect();
    if (!anchor) return;

    // En el primer cálculo el popover todavía no existe; después se usa su alto real,
    // que depende del mes (algunos necesitan una semana más).
    const height = popoverRef.current?.offsetHeight || POPOVER_HEIGHT;

    const spaceBelow = window.innerHeight - anchor.bottom;
    const openUpwards = spaceBelow < height + GUTTER && anchor.top > spaceBelow;

    const rawTop = openUpwards ? anchor.top - height - GUTTER : anchor.bottom + GUTTER;

    // Se acota a la ventana en los dos ejes: si no entra de ningún lado, es preferible
    // que quede pegado a un borde y completo, y no cortado arriba.
    const clamp = (value: number, max: number) => Math.min(Math.max(GUTTER, value), Math.max(GUTTER, max));

    const top = clamp(rawTop, window.innerHeight - height - GUTTER);
    const left = clamp(anchor.left, window.innerWidth - POPOVER_WIDTH - GUTTER);

    // Devolver el mismo objeto si no cambió nada hace que React se saltee el re-render,
    // y con eso el efecto de re-medición de abajo no se realimenta.
    setPosition((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    // capture: true para enterarse también del scroll del modal, no solo del de la ventana.
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  // Segunda pasada, ya con el popover montado: la primera no puede medirlo y usa el alto
  // estimado. También corre al cambiar de mes, porque algunos meses ocupan una fila más.
  useLayoutEffect(() => {
    if (open && position) updatePosition();
  }, [open, position, view, updatePosition]);

  useEffect(() => {
    if (open) focusedDayRef.current?.focus();
  }, [open, focusedDate]);

  const openPopover = () => {
    if (disabled) return;
    const start = selected ?? maxDate ?? todayLocal();
    setView({ year: start.getFullYear(), month: start.getMonth() });
    setFocusedDate(start);
    setOpen(true);
  };

  const commit = (date: Date | null) => {
    onChange(date);
    setText(toDisplay(date));
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    const masked = maskDisplay(event.target.value);
    setText(masked);

    if (masked === '') {
      onChange(null);
      return;
    }

    // Solo se propaga cuando el texto ya es una fecha completa y válida; los estados
    // intermedios ("15/0") no tienen que llegar al formulario.
    const parsed = parseDisplay(masked);
    if (parsed && clampToRange(parsed, minDate, maxDate)) {
      onChange(parsed);
      setView({ year: parsed.getFullYear(), month: parsed.getMonth() });
    }
  };

  const handleBlur = () => {
    isTypingRef.current = false;
    if (text === '') return;

    const parsed = parseDisplay(text);
    // Texto incompleto o fuera de rango: se vuelve al último valor válido en vez de
    // dejar el campo en un estado que no coincide con lo que se va a guardar.
    if (!parsed || !clampToRange(parsed, minDate, maxDate)) {
      setText(toDisplay(value));
    }
  };

  const shiftFocus = (days: number) => {
    setFocusedDate((current) => {
      const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + days);
      setView({ year: next.getFullYear(), month: next.getMonth() });
      return next;
    });
  };

  const shiftMonth = (delta: number) => {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const handlePopoverKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closePopover(true);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        shiftFocus(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        shiftFocus(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        shiftFocus(-7);
        break;
      case 'ArrowDown':
        event.preventDefault();
        shiftFocus(7);
        break;
      case 'PageUp':
        event.preventDefault();
        shiftMonth(-1);
        break;
      case 'PageDown':
        event.preventDefault();
        shiftMonth(1);
        break;
      default:
        break;
    }
  };

  const selectDay = (date: Date) => {
    commit(date);
    closePopover(true);
  };

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view]);
  const now = todayLocal();

  const popover = open && position && (
    <div
      ref={popoverRef}
      className="ha-datefield-popover"
      style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
      role="dialog"
      aria-modal="false"
      aria-label="Seleccionar fecha"
      onKeyDown={handlePopoverKeyDown}
    >
      <div className="ha-datefield-header">
        <button
          type="button"
          className="ha-datefield-nav"
          aria-label="Mes anterior"
          onClick={() => shiftMonth(-1)}
        >
          <FaChevronLeft />
        </button>

        <div className="ha-datefield-selects">
          <select
            className="form-select form-select-sm"
            aria-label="Mes"
            value={view.month}
            onChange={(e) => setView((c) => ({ ...c, month: Number(e.target.value) }))}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>

          {/* El salto directo de año es lo que hace usable una fecha de nacimiento:
              sin esto llegar a 1948 son cientos de clicks en "mes anterior". */}
          <select
            className="form-select form-select-sm"
            aria-label="Año"
            value={view.year}
            onChange={(e) => setView((c) => ({ ...c, year: Number(e.target.value) }))}
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="ha-datefield-nav"
          aria-label="Mes siguiente"
          onClick={() => shiftMonth(1)}
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="ha-datefield-weekdays" aria-hidden="true">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span key={`${initial}-${index}`}>{initial}</span>
        ))}
      </div>

      <div className="ha-datefield-grid" role="grid">
        {cells.map(({ date, inMonth }) => {
          const allowed = clampToRange(date, minDate, maxDate);
          const isSelected = isSameDay(date, selected);
          const isFocused = isSameDay(date, focusedDate);

          const classes = [
            'ha-datefield-day',
            inMonth ? '' : 'ha-datefield-day-outside',
            isSelected ? 'ha-datefield-day-selected' : '',
            !isSelected && isSameDay(date, now) ? 'ha-datefield-day-today' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={date.toISOString()}
              ref={isFocused ? focusedDayRef : undefined}
              type="button"
              className={classes}
              disabled={!allowed}
              tabIndex={isFocused ? 0 : -1}
              aria-selected={isSelected}
              aria-label={`${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`}
              onClick={() => selectDay(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="ha-datefield-footer">
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={!clampToRange(now, minDate, maxDate)}
          onClick={() => selectDay(now)}
        >
          Hoy
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => { commit(null); closePopover(true); }}
        >
          Limpiar
        </button>
      </div>
    </div>
  );

  return (
    <div className="ha-datefield">
      {label && <label htmlFor={id} className="ha-datefield-label">{label}</label>}

      <div className="ha-datefield-wrapper" ref={wrapperRef}>
        <input
          ref={inputRef}
          id={id}
          className="form-control"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Escape' && open) closePopover(); }}
        />
        <button
          type="button"
          className="ha-datefield-trigger"
          aria-label={open ? 'Cerrar calendario' : 'Abrir calendario'}
          aria-expanded={open}
          disabled={disabled}
          onClick={() => (open ? closePopover(true) : openPopover())}
        >
          <FaRegCalendarAlt />
        </button>
      </div>

      {error && <div className="ha-form-error">{error}</div>}

      {popover && createPortal(popover, document.body)}
    </div>
  );
};

export default DateField;
