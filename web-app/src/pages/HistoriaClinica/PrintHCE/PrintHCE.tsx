import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useEffect } from "react";

import { useSelector } from "react-redux";
import CalculateAge from "../../../Functions/CalculateAge";
import { Evolution } from "../../../Types/Evolution";
import { Patient } from "../../../Types/Person";
import { store } from "../../../Redux/Store";
import formatDate from "../../../Functions/FormatDate";

import convertJsonToHtml from "../../../Functions/ConvertJsonToHTML";
import logger, { describeError } from '../../../lib/logger';

interface Props {
    evoluciones: Evolution[];
    patient: Patient
    onClose: () => void;
}

const PrintHCE : React.FC<Props> = ( {evoluciones, patient, onClose} ) =>{

        const convertToPDF = () => {
          const input = document.getElementById('download');
          if (input) {
            html2canvas(input)
              .then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF();
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${patient.Name}${patient.LastName}HistoriaClinica`);
              });
          } else {
            logger.error('No se encontró el elemento con id "download" para exportar el PDF');
          }
        };


    const stateRedux = useSelector((store: store) => store.Professional);

    return (
        <div className="hce-print">
            <div className="modal-body print" id="download">
                <div className="d-flex flex-column mb-4">
                    <h2 className="h2 fw-bold mx-4 mt-2">
                        Historia Clínica
                    </h2>
                    <div className="d-flex px-4 justify-content-between mt-3">
                        <div className="d-flex flex-column"> 
                            <span className="fw-bold">{patient.Name} {patient.LastName}</span>
                            <small className="fst-italic">DNI {patient.DNI}</small>
                            <small>{CalculateAge(patient.BirthDate) ?? '—'} años</small>
                        </div>
                        <div className="d-flex flex-column">
                            <span className="fw-bold">{stateRedux.name}, {stateRedux.lastName}</span>
                            <small className="fst-italic">M.P. {stateRedux.tuition}</small>
                        </div>
                    </div>
                </div>
                <div className="mt-4"><div></div></div>
                <div className="mt-3"><div className="p-1"></div></div>
                <div className="mt-3">
                    <div className="p-1">
                        <div className="d-flex align-items-center bg-light px-4 py-2 mb-2">
                            <h5 className="h4 fw-bold mb-0 py-2">Evoluciones</h5>
                        </div>
                        {evoluciones.map((evolucion, index) => (
                            <div key={index} className=" border-bottom px-4 py-3">
                                <span>{formatDate(evolucion.DateAdded)}</span>
                                <small className="text-muted fw-normal"> Por {evolucion.ModifiedBy.modifiedBy}</small>
                                <div>
                                    <div className="mt-3"><div dangerouslySetInnerHTML={{ __html: evolucion.Notes }} /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="hce-print-actions d-print-none">
                <button className="btn btn-primary" onClick={() => convertToPDF()}>Descargar PDF</button>
                <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            </div>
        </div>
    )
}

export default PrintHCE;