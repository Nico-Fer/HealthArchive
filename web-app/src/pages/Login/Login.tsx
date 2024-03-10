import Form from "./Components/Form/Form";

import { Link } from 'react-router-dom';

import "./Login.scss";

const Login = () => {
    return (
        <div className="login-container d-flex justify-content-center align-items-center" style={{ height: '100vh', backgroundColor: '#EAEAEA', margin: 'auto'}}>
            <div className="Card border-primary rounded" style={{ width: '30rem', backgroundColor: 'white', margin: '', height: '30rem', padding: '20px' }}>
            <div className="text-left" style={{marginLeft:'1em'}}>
                <h1 className="title">Inicia Sesion</h1>
                <h2 className="secondary-text">Para empezar</h2>
            </div>
                <Form/>
                <p className="small-text text-center">
                    ¿Usuario Nuevo? <Link to="register" style={{ color: 'black', fontWeight: 'bold', textDecoration: 'none' }}>Registrarse</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;