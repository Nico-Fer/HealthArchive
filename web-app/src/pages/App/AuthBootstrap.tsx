import { ReactNode, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAuthFailureHandler } from "../../api/client";
import { createProfessionalRed, resetProfessionalRed } from "../../Redux/States/professional";
import { sessionAnonymous, sessionAuthenticated } from "../../Redux/States/session";
import { store } from "../../Redux/Store";
import { PublicRoutes } from "../../Types/Routes";
import logger, { describeError } from "../../lib/logger";
import {
  anotherTabHasSession,
  clearSessionTouch,
  clearTabSession,
  hasTabSession,
  markTabSession,
  onSessionLogout,
} from "../../lib/session";
import Spinner from "../../components/Spinner";

// Al montar la app, si el localStorage dice que hay sesión, valida la cookie httpOnly
// contra /Me. Si es válida, rehidrata Redux con el perfil del server; si no, limpia el
// estado local (evita el caso "localStorage logueado pero la cookie expiró").
//
// Antes de eso decide si la sesión sigue en pie: si esta pestaña es nueva (no tiene el
// flag de sessionStorage) y no hay otra pestaña de la app con la sesión abierta, es que
// se cerraron todas, y la sesión se cierra (decisión de producto: cerrar la última
// pestaña equivale a cerrar sesión).
//
// Envuelve a la app en vez de renderizar null: hasta que /Me conteste no se sabe si hay
// sesión, y renderizar las rutas antes hacía que se viera el Login (o el navbar de
// "Cerrar Sesión") con el estado equivocado.
const AuthBootstrap = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const status = useSelector((state: store) => state.Session.status);
  const [checking, setChecking] = useState(() => localStorage.getItem("Professional") !== null);

  // Cuando la sesión muere en cualquier request, limpiar el estado y volver al Login sin
  // recargar la página entera (el fallback de client.ts hace window.location.href).
  useEffect(() => {
    setAuthFailureHandler(() => {
      dispatch(resetProfessionalRed());
      dispatch(sessionAnonymous("expired"));
      navigate(PublicRoutes.LOGIN, { replace: true });
    });

    return () => setAuthFailureHandler(null);
  }, [dispatch, navigate]);

  // Otra pestaña cerró la sesión (logout manual o por inactividad): las cookies ya no
  // sirven, así que esta se cierra también, sin volver a llamar al API.
  useEffect(
    () =>
      onSessionLogout((reason) => {
        dispatch(resetProfessionalRed());
        dispatch(sessionAnonymous(reason));
        navigate(PublicRoutes.LOGIN, { replace: true });
      }),
    [dispatch, navigate]
  );

  // El flag de pestaña sigue al estado: así cubre login, rehidratación y cualquier logout.
  useEffect(() => {
    if (status === "authenticated") markTabSession();
    else if (status === "anonymous") clearTabSession();
  }, [status]);

  useEffect(() => {
    if (!localStorage.getItem("Professional")) {
      dispatch(sessionAnonymous());
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (!hasTabSession() && !(await anotherTabHasSession())) {
          if (cancelled) return;
          // Best-effort: revoca el refresh token si la cookie sigue ahí. Aunque falle,
          // el server lo da por vencido solo a las 2 h sin actividad.
          logger.info("No queda ninguna pestaña con la sesión abierta: se cierra la sesión");
          await apiFetch("/api/AuthService/Logout", { method: "POST" }, { redirectOnAuthFailure: false }).catch(
            () => undefined
          );
          if (cancelled) return;
          clearSessionTouch();
          dispatch(resetProfessionalRed());
          dispatch(sessionAnonymous());
          return;
        }
        if (cancelled) return;

        // redirectOnAuthFailure: false — un 401 acá es un resultado esperado (sesión
        // vencida), no algo que resolver expulsando al Login en medio del arranque.
        const res = await apiFetch("/api/AuthService/Me", undefined, { redirectOnAuthFailure: false });
        if (cancelled) return;

        if (res.ok) {
          dispatch(createProfessionalRed(await res.json()));
          dispatch(sessionAuthenticated());
        } else {
          logger.info("La sesión guardada ya no es válida", { status: res.status });
          dispatch(resetProfessionalRed());
          dispatch(sessionAnonymous("expired"));
        }
      } catch (error) {
        if (cancelled) return;
        // Error de red: se mantiene el estado local optimista. Si el API está caído,
        // mandar al Login tampoco ayudaría, porque loguearse tampoco va a funcionar.
        logger.warn("No se pudo validar la sesión contra el servidor", describeError(error));
        dispatch(sessionAuthenticated());
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (checking) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <Spinner label="Cargando..." />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthBootstrap;
