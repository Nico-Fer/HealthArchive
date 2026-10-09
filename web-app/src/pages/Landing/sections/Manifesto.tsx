import { PiTextAa, PiUsersThree } from 'react-icons/pi';

const Manifesto = () => (
  <section className="lp-manifesto">
    <div className="lp-container lp-manifesto-inner" data-reveal>
      <p className="lp-manifesto-quote">
        Un consultorio es un equipo. <strong>Su historia clínica también.</strong>
      </p>
      <div className="lp-manifesto-points">
        <p><PiUsersThree aria-hidden="true" /> Los profesionales del consultorio se cubren entre sí y ven la misma historia.</p>
        <p><PiTextAa aria-hidden="true" /> Letra grande y pantallas despejadas, para leer cómodo durante toda la jornada.</p>
      </div>
    </div>
  </section>
);

export default Manifesto;
