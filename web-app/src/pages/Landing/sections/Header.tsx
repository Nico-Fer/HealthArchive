import { Link } from 'react-router-dom';
import { PiPlusBold } from 'react-icons/pi';
import { PublicRoutes } from '../../../Types/Routes';

const Header = () => (
  <header className="lp-header">
    <div className="lp-container lp-header-inner">
      <a href="#inicio" className="lp-brand">
        <span className="lp-brand-mark" aria-hidden="true"><PiPlusBold /></span>
        HealthArchive
      </a>
      <nav className="lp-header-nav" aria-label="Secciones">
        <a href="#funciones">Funciones</a>
        <a href="#consulta">Cómo se usa</a>
        <a href="#seguridad">Seguridad</a>
      </nav>
      <Link to={PublicRoutes.LOGIN} className="lp-btn lp-btn-ghost">Ingresar</Link>
    </div>
  </header>
);

export default Header;
