import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { Person, Patient } from '../../../Types/Person';
import { useNavigate } from 'react-router-dom';

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
  const dni = patient.DNI;
  navigate('/Pacientes/HistoriaClinica', {state: {patient}})
}

  return (
    <div className="table-container">
      <div className="shadow-sm rounded bg-white table-responsive">
        <table className="table align-middle m-0">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Obra Social</th>
              <th>Contacto</th>
              <th>HCE</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr className="bg-white" key={index}>
                <td
                  className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3"
                >
                  <div className="text-truncate">
                    <a href="#" onClick={(e) => handleClick(e, item )} style={{textDecoration: 'none'}}>{item.Name}, {item.LastName}</a>
                  </div>
                  <div className="form-text m-0">{item.DNI}</div>
                </td>

                  <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3 d-lg-table-cell d-none">
                      <div className="d-flex align-items-center">
                        <div>
                          <div>{item.MedicalCoverage.Number}</div>
                          <div className="form-text m-0">
                            {item.MedicalCoverage.Coverage}
                          </div>
                        </div>
                      </div>
                  </td>

                <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3 d-lg-table-cell d-none">
                  <div className="d-flex align-items-center">
                    <div>
                      {item.PhoneNumber && item.PhoneNumber.PhoneNumber !== '' && (
                        <div className="phone-number" style={{color: '#198754'}}>
                          <FaWhatsapp className="whatsapp-icon" />
                          <span>
                            {item.PhoneNumber.CountryCode}{' '}
                            {item.PhoneNumber.PhoneNumber}
                          </span>
                        </div>
                      )}
                      {item.Email !== '' && (
                        <div>
                          <a
                            href={`mailto:${item.Email}`}
                            style={{ fontSize: '15px', textDecoration: 'none' }}
                          >
                            {item.Email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                  <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3">
                    <button className="btn btn-primary" onClick={() => getClinicHistory(item as Patient)}>HCE</button>
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
