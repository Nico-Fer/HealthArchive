import { ReactNode, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAuthFailureHandler } from "../../api/client";
import { createProfessionalRed, resetProfessionalRed } from "../../Redux/States/professional";
import { sessionAnonymous, sessionAuthenticated } from "../../Redux/States/session";
import { PublicRoutes } from "../../Types/Routes";
import logger, { describeError } from "../../lib/logger";
import Spinner from "../../components/Spinner";

// Al montar la app, si el localStorage dice que hay sesión, valida la cookie httpOnly
// contra /Me. Si es válida, rehidrata Redux con el perfil del server; si no, limpia el
// estado local (evita el caso "localStorage logueado pero la cookie expiró").
//
// Envuelve a la app en vez de renderizar null: hasta que /Me conteste no se sabe si hay
// sesión, y renderizar las rutas antes hacía que se viera el Login (o el navbar de
// "Cerrar Sesión") con el estado equivocado.
const AuthBootstrap = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(() => localStorage.getItem("Professional") !== null);

  // Cuando la sesión muere en cualquier request, limpiar el estado y volver al Login sin
  // recargar la página entera (el fallback de client.ts hace window.location.href).
  useEffect(() => {
    setAuthFailureHandler(() => {
      dispatch(resetProfessionalRed());
      dispatch(sessionAnonymous());
      navigate(PublicRoutes.LOGIN, { replace: true });
    });

    return () => setAuthFailureHandler(null);
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!localStorage.getItem("Professional")) {
      dispatch(sessionAnonymous());
      return;
    }

    let cancelled = false;
    (async () => {
      try {
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
          dispatch(sessionAnonymous());
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
