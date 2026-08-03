import { Navigate, Outlet } from "react-router-dom";
import { store } from "../Redux/Store";
import { useSelector } from "react-redux";
import { PrivateRoutes } from "../Types/Routes";

// Espejo de AuthGuard: con sesión activa no tiene sentido mostrar Login ni Registro.
// Sin esto, abrir la app ya logueado dejaba al usuario en la pantalla de Login.
export const PublicGuard = () => {
    const status = useSelector((store : store) => store.Session.status);
    return status === 'authenticated' ? <Navigate replace to={PrivateRoutes.PACIENTES}/> : <Outlet/>
}

export default PublicGuard;
