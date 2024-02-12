import { Link } from 'react-router-dom';
import './Navbar.scss';

const NavBar = () => {
  return (
    <nav className='sticky-top navbar navbar-expand-lg navbar-light bg-white border-bottom d-print-none'>
      <div className='container-fluid'>
        <div className='collapse navbar-collapse'>
          <ul className='navbar-nav me-auto gap-lg-3'>
            <li className='nav-item'>
              <Link to="/Pacientes" className='nav-link'>Pacientes</Link>
            </li>
            <li className='nav-item'>
              <Link to="/Profesionales" className='nav-link'>Profesionales</Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
