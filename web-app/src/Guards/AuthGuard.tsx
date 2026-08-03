import { Navigate, Outlet } from "react-router-dom";
import { store } from "../Redux/Store";
import { useSelector } from "react-redux";
import { PublicRoutes } from "../Types/Routes";

// Decide por Session.status, no por el perfil: es el mismo predicado que usan NavBar y
// PublicGuard, así los tres no pueden discrepar. AuthBootstrap garantiza que para cuando
// esto se renderiza el status ya no es 'checking'.
export const AuthGuard = () => {
    const status = useSelector((store : store) => store.Session.status);
    return status === 'authenticated' ? <Outlet/> : <Navigate replace to={PublicRoutes.LOGIN}/>
}

export default AuthGuard;
