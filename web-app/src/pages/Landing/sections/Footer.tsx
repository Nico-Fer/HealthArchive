import { Link } from 'react-router-dom';
import { PiPlusBold } from 'react-icons/pi';
import { PublicRoutes } from '../../../Types/Routes';

const Footer = () => (
  <footer className="lp-footer">
    <div className="lp-container lp-footer-inner">
      <span className="lp-brand">
        <span className="lp-brand-mark" aria-hidden="true"><PiPlusBold /></span>
        HealthArchive
      </span>
      <p>Gestión de historias clínicas electrónicas para consultorios.</p>
      <Link to={PublicRoutes.LOGIN}>Ingresar</Link>
    </div>
  </footer>
);

export default Footer;
