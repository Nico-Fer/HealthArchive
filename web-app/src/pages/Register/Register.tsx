import { Link } from 'react-router-dom';

import RegisterForm from './RegisterForm/RegisterForm';

const Register = () => {
    return (
        <div className="login-container d-flex justify-content-center align-items-center" style={{ height: '120vh', backgroundColor: '#EAEAEA', margin: 'auto'}}>
            <div className="Card border-primary rounded" style={{ width: '30rem', backgroundColor: 'white', margin: '', height: '40rem', padding: '20px' }}>
            <div>
                <h1 className="title text-center">Registro</h1>
            </div>
                <RegisterForm/>
                <p className="small-text text-center">
                    ¿Ya tenes una cuenta creada? <Link to="/" style={{ color: 'black', fontWeight: 'bold', textDecoration: 'none' }}>Inicio Sesion</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;