import { Link } from 'react-router-dom';
import './Navbar.scss';
import { useDispatch } from 'react-redux';
import { resetProfessionalRed } from '../../../Redux/States/professional';

const NavBar = () => {

  const dispatch = useDispatch();

  const handleSignOut = () =>{
    dispatch(resetProfessionalRed())
  }

  return (
    <nav className='sticky-top navbar navbar-expand-lg navbar-light bg-white border-bottom d-print-none'>
      <div className='container-fluid'>
        <div className='collapse navbar-collapse'>
          <div className='d-flex justify-content-between align-items-center w-100'>
            <div>
              <ul className='navbar-nav me-auto gap-lg-3'>
                <li className='nav-item'>
                  <Link to="/Pacientes" className='nav-link'>Pacientes</Link>
                </li>
                <li className='nav-item'>
                  <Link to="/Profesionales" className='nav-link'>Profesionales</Link>
                </li>
              </ul>
            </div>
            <button className='btn btn-outline-primary' onClick={() => handleSignOut()}>Cerrar Sesion</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
