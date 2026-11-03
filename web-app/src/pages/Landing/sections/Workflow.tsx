import { useState } from 'react';
import { PiMagnifyingGlass, PiNotePencil, PiPrinter } from 'react-icons/pi';
import { IconType } from 'react-icons';
import Screenshot from '../Screenshot';

interface Step {
  id: string;
  icon: IconType;
  title: string;
  text: string;
  shot: 'pacientes' | 'evolucion' | 'pdf';
  alt: string;
}

const steps: Step[] = [
  {
    id: 'buscar',
    icon: PiMagnifyingGlass,
    title: 'Buscá al paciente',
    text: 'Por nombre, apellido o DNI, desde el listado del consultorio.',
    shot: 'pacientes',
    alt: 'Listado de pacientes del consultorio',
  },
  {
    id: 'escribir',
    icon: PiNotePencil,
    title: 'Escribí la evolución',
    text: 'Un editor de texto pensado para notas clínicas, con tu firma automática.',
    shot: 'evolucion',
    alt: 'Editor de una evolución clínica',
  },
  {
    id: 'imprimir',
    icon: PiPrinter,
    title: 'Imprimí la historia',
    text: 'Generá el PDF de la historia clínica con todas sus evoluciones.',
    shot: 'pdf',
    alt: 'Historia clínica exportada a PDF',
  },
];

// Tabs: cada paso cambia la captura de al lado. Las tres capturas quedan montadas y se
// cruzan con opacidad, así cambiar de paso no recarga la imagen ni mueve el layout.
const Workflow = () => {
  const [active, setActive] = useState(0);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const next = (active + (e.key === 'ArrowDown' ? 1 : steps.length - 1)) % steps.length;
    setActive(next);
    document.getElementById(`lp-step-${steps[next].id}`)?.focus();
  };

  return (
    <section className="lp-section lp-workflow" id="consulta">
      <div className="lp-container">
        <h2 className="lp-section-title" data-reveal>Una consulta, de principio a fin</h2>

        <div className="lp-workflow-grid" data-reveal>
          <div className="lp-steps" role="tablist" aria-orientation="vertical" onKeyDown={onKeyDown}>
            {steps.map((step, i) => {
              const Icon = step.icon;
              const selected = i === active;
              return (
                <button
                  key={step.id}
                  id={`lp-step-${step.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`lp-panel-${step.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`lp-step ${selected ? 'is-active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className="lp-step-icon"><Icon aria-hidden="true" /></span>
                  <span>
                    <span className="lp-step-title">{step.title}</span>
                    <span className="lp-step-text">{step.text}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lp-workflow-stage">
            {steps.map((step, i) => (
              <div
                key={step.id}
                id={`lp-panel-${step.id}`}
                role="tabpanel"
                aria-labelledby={`lp-step-${step.id}`}
                aria-hidden={i !== active}
                className={`lp-workflow-panel ${i === active ? 'is-active' : ''}`}
              >
                <Screenshot name={step.shot} alt={step.alt} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Workflow;
