import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { apiFetch } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";
import logger, { describeError } from "../../lib/logger";
import {
  getTouchedAt,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  KEEPALIVE_INTERVAL_MS,
  touchSession,
} from "../../lib/session";
import { logout } from "../../Redux/States/professional";
import { store } from "../../Redux/Store";

// Eventos que cuentan como "el médico está usando la app". scroll va aparte, en captura,
// porque no burbujea y casi todo el scroll de la app es de contenedores internos.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"] as const;
const CHECK_EVERY_MS = 15_000;

/**
 * Cierre de sesión por inactividad. La actividad del usuario (teclado, mouse, scroll) se
 * informa al server con /KeepAlive como mucho cada KEEPALIVE_INTERVAL_MS, y el reloj se
 * mide desde el último KeepAlive: así coincide con el vencimiento del refresh token en el
 * server. Avisa IDLE_WARNING_MS antes y al llegar a IDLE_TIMEOUT_MS cierra la sesión.
 *
 * El "último toque" vive en localStorage, así que todas las pestañas comparten el mismo
 * reloj: usar la app en una pestaña mantiene viva la sesión en las demás.
 */
const IdleWatcher = () => {
  const dispatch = useDispatch<any>();
  const isLogged = useSelector((state: store) => state.Session.status === "authenticated");
  const [showWarning, setShowWarning] = useState(false);

  // Respaldo en memoria por si localStorage no está disponible.
  const localTouchedAt = useRef(0);
  const loggingOut = useRef(false);

  const touchedAt = () => Math.max(getTouchedAt() ?? 0, localTouchedAt.current);

  const keepAlive = useCallback(() => {
    // El clic en "Seguir conectado" llega justo después del pointerdown, que ya mandó uno.
    if (Date.now() - localTouchedAt.current < 2000) {
      setShowWarning(false);
      return;
    }
    localTouchedAt.current = Date.now();
    touchSession();
    setShowWarning(false);
    // Un 401 acá (la sesión ya venció en el server) lo resuelve apiFetch: intenta
    // refresh y, si no puede, manda al Login.
    apiFetch("/api/AuthService/KeepAlive", { method: "POST" }).catch((error) =>
      logger.warn("No se pudo renovar la sesión", describeError(error))
    );
  }, []);

  useEffect(() => {
    if (!isLogged) {
      setShowWarning(false);
      return;
    }

    loggingOut.current = false;
    localTouchedAt.current = getTouchedAt() ?? 0;
    if (!localTouchedAt.current) keepAlive();

    const check = () => {
      if (loggingOut.current) return;

      const idle = Date.now() - touchedAt();
      if (idle >= IDLE_TIMEOUT_MS) {
        loggingOut.current = true;
        setShowWarning(false);
        logger.info("Sesión cerrada por inactividad");
        dispatch(logout("idle"));
        return;
      }
      setShowWarning(idle >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
    };

    let lastHandled = 0;
    const onActivity = () => {
      const now = Date.now();
      // mousemove dispara decenas de veces por segundo; con mirar una vez por segundo sobra.
      if (now - lastHandled < 1000) return;
      lastHandled = now;

      const idle = now - touchedAt();
      // Si ya se pasó el límite (por ejemplo, la máquina estuvo suspendida y el timer no
      // corrió), mover el mouse no revive la sesión: se cierra como corresponde.
      if (idle >= IDLE_TIMEOUT_MS) check();
      else if (idle >= KEEPALIVE_INTERVAL_MS) keepAlive();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    ACTIVITY_EVENTS.forEach((type) => document.addEventListener(type, onActivity, { passive: true }));
    document.addEventListener("scroll", onActivity, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const interval = window.setInterval(check, CHECK_EVERY_MS);
    check();

    return () => {
      ACTIVITY_EVENTS.forEach((type) => document.removeEventListener(type, onActivity));
      document.removeEventListener("scroll", onActivity, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.clearInterval(interval);
    };
  }, [isLogged, dispatch, keepAlive]);

  if (!isLogged || !showWarning) return null;

  // "Seguir conectado" va en onCancel porque también es lo que dispara el clic en el
  // fondo: un clic accidental no tiene que cerrar la sesión.
  return (
    <ConfirmDialog
      title="¿Seguís ahí?"
      message={`Por inactividad, tu sesión se va a cerrar en menos de ${Math.round(IDLE_WARNING_MS / 60_000)} minutos.`}
      confirmLabel="Cerrar sesión"
      cancelLabel="Seguir conectado"
      onConfirm={() => dispatch(logout())}
      onCancel={keepAlive}
    />
  );
};

export default IdleWatcher;
