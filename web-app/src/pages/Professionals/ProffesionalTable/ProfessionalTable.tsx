import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { Person } from '../../../Types/Person';
import { useNavigate } from 'react-router-dom';

interface Props {
  data: Array<Person>;
}

const ProfessionalTable: React.FC<Props> = ({ data}) => {
  const navigate = useNavigate();

  const handleClick = ( e: React.MouseEvent<HTMLAnchorElement>, professional: Person) => {
    e.preventDefault();
    const email = professional.Email;
    navigate('/Profesionales/Profesional', {state:{email}});
  }

  return (
    <div className="table-container">
      <div className="shadow-sm rounded bg-white table-responsive">
        <table className="table align-middle m-0">
          <thead>
            <tr>
              <th className="text-start">Nombre</th>
              <th className="text-end">Contacto</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr className="bg-white" key={index}>
                <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3 text-start">
                  <div className="text-truncate">
                    <a href="#" onClick={(e) => handleClick(e, item)} style={{textDecoration: 'none'}}>{item.Name}, {item.LastName}</a>
                  </div>
                </td>

                <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3 d-lg-table-cell d-none">
                  <div className="text-end">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfessionalTable;