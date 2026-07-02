import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { apiFetch } from "../../api/client";
import { createProfessionalRed, resetProfessionalRed } from "../../Redux/States/professional";

// Al montar la app, si el localStorage dice que hay sesión, valida la cookie httpOnly
// contra /Me. Si es válida, rehidrata Redux con el perfil del server; si no, limpia el
// estado local (evita el caso "localStorage logueado pero la cookie expiró").
const AuthBootstrap = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!localStorage.getItem("Professional")) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/AuthService/Me");
        if (cancelled) return;
        if (res.ok) {
          dispatch(createProfessionalRed(await res.json()));
        } else {
          dispatch(resetProfessionalRed());
        }
      } catch {
        // Error de red: se mantiene el estado local optimista.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return null;
};

export default AuthBootstrap;
