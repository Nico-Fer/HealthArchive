import { Link } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';

import RegisterForm from './RegisterForm/RegisterForm';

const Register = () => {
    return (
        <div className="ha-auth">
            <div className="ha-auth-brand">
                <span className="ha-auth-logo" aria-hidden="true"><FaPlus /></span>
                <h1 className="ha-auth-title">HealthArchive</h1>
                <p className="ha-auth-subtitle">Gestión Médica Profesional</p>
            </div>
            <div className="ha-auth-card">
                <h2 className="ha-auth-card-title">Crear nueva cuenta</h2>
                <p className="ha-auth-card-subtitle">Ingrese sus credenciales profesionales para comenzar.</p>
                <RegisterForm/>
                <p className="ha-auth-footer">
                    ¿Ya tenes una cuenta creada? <Link to="/">Inicio Sesion</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
