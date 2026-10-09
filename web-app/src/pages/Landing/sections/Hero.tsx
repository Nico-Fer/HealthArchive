import { PiArrowRight } from 'react-icons/pi';
import Screenshot from '../Screenshot';

const Hero = () => (
  <section className="lp-hero" id="inicio">
    <div className="lp-hero-glow" aria-hidden="true" />
    <div className="lp-container lp-hero-grid">
      <div className="lp-hero-copy">
        <p className="lp-eyebrow lp-enter" style={{ '--i': 0 } as React.CSSProperties}>
          Historia clínica electrónica
        </p>
        <h1 className="lp-hero-title lp-enter" style={{ '--i': 1 } as React.CSSProperties}>
          La historia clínica de tu consultorio, <em>ordenada y segura.</em>
        </h1>
        <p className="lp-hero-sub lp-enter" style={{ '--i': 2 } as React.CSSProperties}>
          Pacientes, evoluciones y estudios en un solo lugar, compartidos con tu equipo y
          firmados por quien los escribe.
        </p>
        <div className="lp-hero-actions lp-enter" style={{ '--i': 3 } as React.CSSProperties}>
          <a href="#funciones" className="lp-btn lp-btn-primary">
            Ver funciones <PiArrowRight aria-hidden="true" />
          </a>
          <a href="#consulta" className="lp-btn lp-btn-soft">Cómo se usa</a>
        </div>
      </div>

      <div className="lp-hero-visual lp-enter" style={{ '--i': 2 } as React.CSSProperties}>
        <Screenshot name="hce" alt="Historia clínica de un paciente con sus evoluciones" eager />
      </div>
    </div>
  </section>
);

export default Hero;
