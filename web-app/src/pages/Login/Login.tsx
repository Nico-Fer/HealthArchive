import Form from "./Components/Form/Form";

import { Link } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import { useSelector } from 'react-redux';

import { PublicRoutes } from "../../Types/Routes";
import { store } from '../../Redux/Store';
import { SessionEndReason } from '../../Redux/States/session';

const END_MESSAGES: Record<SessionEndReason, string> = {
    idle: 'Tu sesión se cerró por inactividad. Volvé a iniciar sesión para continuar.',
    expired: 'Tu sesión expiró. Volvé a iniciar sesión para continuar.',
};

const Login = () => {
    const endedReason = useSelector((state: store) => state.Session.endedReason);

    return (
        <div className="ha-auth">
            <div className="ha-auth-brand">
                <span className="ha-auth-logo" aria-hidden="true"><FaPlus /></span>
                <h1 className="ha-auth-title">HealthArchive</h1>
                <p className="ha-auth-subtitle">Gestión Médica Profesional</p>
            </div>
            <div className="ha-auth-card">
                <h2 className="ha-auth-card-title">Inicia Sesión</h2>
                <p className="ha-auth-card-subtitle">Para empezar</p>
                {endedReason && (
                    <div className="alert alert-info" role="status">{END_MESSAGES[endedReason]}</div>
                )}
                <Form/>
                <p className="ha-auth-footer">
                    ¿Usuario Nuevo? <Link to={PublicRoutes.REGISTER}>Registrarse</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
