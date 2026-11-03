import { PiBuildings, PiLockKey, PiSignature, PiTranslate, PiPenNib } from 'react-icons/pi';

const points = [
  {
    icon: PiBuildings,
    title: 'Cada consultorio, aislado',
    text: 'Un profesional solo ve los pacientes de su consultorio. Nadie de afuera llega a esos datos.',
  },
  {
    icon: PiPenNib,
    title: 'Solo el autor edita su evolución',
    text: 'El equipo puede leer todo, pero una evolución la modifica únicamente quien la escribió.',
  },
  {
    icon: PiSignature,
    title: 'Firma en cada registro',
    text: 'Cada evolución guarda quién la escribió, con su matrícula, y cuándo se editó por última vez.',
  },
  {
    icon: PiLockKey,
    title: 'Acceso protegido',
    text: 'Contraseñas cifradas, sesiones que vencen y alta de profesionales solo con código del consultorio.',
  },
  {
    icon: PiTranslate,
    title: 'A salvo del traductor',
    text: 'El traductor del navegador no puede reescribir una sigla clínica y guardarla cambiada.',
  },
];

const Security = () => (
  <section className="lp-section lp-security" id="seguridad">
    <div className="lp-container lp-security-grid">
      <div className="lp-security-intro" data-reveal>
        <h2 className="lp-section-title">Datos clínicos, tratados como tales</h2>
        <p>
          La información de un paciente es sensible. HealthArchive decide quién la ve, quién la
          modifica y deja registro de cada cambio.
        </p>
      </div>

      <ul className="lp-security-list">
        {points.map(({ icon: Icon, title, text }) => (
          <li key={title} data-reveal>
            <span className="lp-security-icon"><Icon aria-hidden="true" /></span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default Security;
