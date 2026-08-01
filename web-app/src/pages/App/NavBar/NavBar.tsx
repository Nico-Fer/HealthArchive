import { Link, NavLink } from 'react-router-dom';
import './Navbar.scss';
import { useDispatch } from 'react-redux';
import { logout } from '../../../Redux/States/professional';
import { useSelector } from "react-redux";
import { store } from '../../../Redux/Store';

const NavBar = () => {

  const dispatch = useDispatch<any>();
  const isLogged = useSelector((state : store) => state.Professional.tuition !== '');
  const professional = useSelector((state : store) => state.Professional);
  if(!isLogged){
    return null;
  }

  const handleSignOut = () =>{
    dispatch(logout())
  }

  return (
    <nav className='sticky-top ha-navbar d-print-none'>
      <div className='ha-navbar-left'>
        <Link to="/Pacientes" className='ha-navbar-brand'>HealthArchive</Link>
        <div className='ha-navbar-links'>
          <NavLink to="/Pacientes" className='ha-navbar-link'>Pacientes</NavLink>
          <NavLink to="/Profesionales" className='ha-navbar-link'>Profesionales</NavLink>
        </div>
      </div>
      <div className='ha-navbar-right'>
        <span className='ha-navbar-user d-none d-md-inline'>{professional.name} {professional.lastName}</span>
        <button className='btn btn-danger' onClick={() => handleSignOut()}>Cerrar Sesión</button>
      </div>
    </nav>
  );
};

export default NavBar;
