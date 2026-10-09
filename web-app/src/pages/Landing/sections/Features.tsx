import { PiAddressBook, PiFilePdf, PiIdentificationCard, PiNotePencil, PiPaperclip } from 'react-icons/pi';

// Bento de 5 celdas: una grande y oscura, el resto con fondos distintos para que la
// grilla no sea una pared de tarjetas blancas iguales.
const Features = () => (
  <section className="lp-section" id="funciones">
    <div className="lp-container">
      <h2 className="lp-section-title" data-reveal>Todo lo que pasa en la consulta, en un solo lugar</h2>

      <div className="lp-bento">
        <article className="lp-cell lp-cell-hce" data-reveal>
          <PiNotePencil className="lp-cell-icon" aria-hidden="true" />
          <h3>Evoluciones con formato</h3>
          <p>
            Escribí cada consulta con negritas, listas y títulos. Cada evolución queda fechada y
            con la firma y matrícula del profesional.
          </p>
          <div className="lp-cell-lines" aria-hidden="true" />
        </article>

        <article className="lp-cell lp-cell-tint" data-reveal>
          <PiIdentificationCard className="lp-cell-icon" aria-hidden="true" />
          <h3>Varias coberturas</h3>
          <p>Cada paciente puede tener más de una obra social o prepaga, con una principal.</p>
        </article>

        <article className="lp-cell lp-cell-dots" data-reveal>
          <PiPaperclip className="lp-cell-icon" aria-hidden="true" />
          <h3>Estudios adjuntos</h3>
          <p>Análisis, imágenes y PDFs guardados dentro de la historia clínica.</p>
        </article>

        <article className="lp-cell" data-reveal>
          <PiFilePdf className="lp-cell-icon" aria-hidden="true" />
          <h3>Exportar a PDF</h3>
          <p>Imprimí o compartí la historia clínica completa cuando el paciente la necesite.</p>
        </article>

        <article className="lp-cell lp-cell-gradient" data-reveal>
          <PiAddressBook className="lp-cell-icon" aria-hidden="true" />
          <h3>Directorio de pacientes</h3>
          <p>Buscá por nombre o DNI y llegá a la historia clínica en dos clics.</p>
        </article>
      </div>
    </div>
  </section>
);

export default Features;
