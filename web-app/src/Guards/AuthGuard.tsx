
import { Navigate, Outlet } from "react-router-dom";
import { Store } from "../Redux/Store";
import { ProfessionalForRedux } from "../Types/ProfessionalForRedux";
import { useSelector } from "react-redux"; 
import { PublicRoutes } from "../Types/Routes";

export const AuthGuard = () => {
    const professionalState = useSelector((store : Store) => store.Professional);
    return professionalState.name ? <Outlet/> : <Navigate replace to={PublicRoutes.LOGIN}/>
}

export default AuthGuard;