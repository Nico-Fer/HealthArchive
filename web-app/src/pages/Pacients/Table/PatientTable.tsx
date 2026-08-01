import React from 'react';
import { FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import { Patient } from '../../../Types/Person';
import { useNavigate } from 'react-router-dom';
import Chip from '../../../components/Chip';

interface Props {
  data: Array<Patient>;
  onPatientClick: (patient: Patient) => void;
}

const Table: React.FC<Props> = ({ data, onPatientClick}) => {
  const navigate = useNavigate();

  const handleClick = ( e: React.MouseEvent<HTMLAnchorElement>, patient : Patient) => {
    e.preventDefault();
    onPatientClick(patient);
  }

const getClinicHistory = (patient : Patient) =>{
  navigate('/Pacientes/HistoriaClinica', {state: {patient}})
}

  return (
    <div className="ha-card ha-table-card">
      <div className="table-responsive">
        <table className="table ha-table align-middle m-0">
          <thead>
            <tr>
              <th>Nombre y DNI</th>
              <th className="d-lg-table-cell d-none">Obra Social</th>
              <th className="d-lg-table-cell d-none">Contacto</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td className="px-3 px-xl-4">
                  <div className="text-truncate">
                    <a href="#" className="ha-row-title" onClick={(e) => handleClick(e, item )}>{item.Name}, {item.LastName}</a>
                  </div>
                  <div className="ha-row-sub">{item.DNI}</div>
                </td>

                <td className="px-3 px-xl-4 d-lg-table-cell d-none">
                  <div className="ha-row-strong">{item.MedicalCoverage.Number}</div>
                  {item.MedicalCoverage.Coverage !== '' && (
                    <Chip label={item.MedicalCoverage.Coverage} tone="blue" />
                  )}
                </td>

                <td className="px-3 px-xl-4 d-lg-table-cell d-none">
                  {item.PhoneNumber && item.PhoneNumber.PhoneNumber !== '' && (
                    <div className="ha-contact-line">
                      <FaWhatsapp aria-hidden="true" />
                      <span>
                        {item.PhoneNumber.CountryCode}{' '}
                        {item.PhoneNumber.PhoneNumber}
                      </span>
                    </div>
                  )}
                  {item.Email !== '' && (
                    <div className="ha-contact-line">
                      <FaEnvelope aria-hidden="true" />
                      <a href={`mailto:${item.Email}`}>{item.Email}</a>
                    </div>
                  )}
                </td>

                <td className="px-3 px-xl-4 text-end">
                  <button className="btn btn-primary" onClick={() => getClinicHistory(item as Patient)}>Ver HCE</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
