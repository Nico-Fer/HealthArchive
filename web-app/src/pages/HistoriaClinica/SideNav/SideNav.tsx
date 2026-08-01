import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FaUsers, FaUserMd, FaSignOutAlt } from 'react-icons/fa';

import { logout } from '../../../Redux/States/professional';
import './SideNav.scss';

const SideNav = () => {
  const dispatch = useDispatch<any>();

  return (
    <aside className="ha-sidenav d-none d-lg-flex d-print-none">
      <nav className="ha-sidenav-nav" aria-label="Secciones">
        <NavLink to="/Pacientes" className="ha-sidenav-item">
          <FaUsers aria-hidden="true" /> Pacientes
        </NavLink>
        <NavLink to="/Profesionales" className="ha-sidenav-item">
          <FaUserMd aria-hidden="true" /> Profesionales
        </NavLink>
      </nav>
      <button type="button" className="ha-sidenav-logout" onClick={() => dispatch(logout())}>
        <FaSignOutAlt aria-hidden="true" /> Cerrar Sesión
      </button>
    </aside>
  );
};

export default SideNav;
