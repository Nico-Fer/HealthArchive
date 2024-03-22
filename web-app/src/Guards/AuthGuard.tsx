
import { Navigate, Outlet } from "react-router-dom";
import { store } from "../Redux/Store";
import { ProfessionalForRedux } from "../Types/ProfessionalForRedux";
import { useSelector } from "react-redux"; 
import { PublicRoutes } from "../Types/Routes";

export const AuthGuard = () => {
    const professionalState = useSelector((store : store) => store.Professional);
    return professionalState.name ? <Outlet/> : <Navigate replace to={PublicRoutes.LOGIN}/>
}

export default AuthGuard;