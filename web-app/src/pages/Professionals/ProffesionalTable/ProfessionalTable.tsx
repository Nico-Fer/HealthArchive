import React from 'react';
import { FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import { Person } from '../../../Types/Person';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../../components/Avatar';

interface ProfessionalRow extends Person {
  Tuition?: string;
}

interface Props {
  data: Array<ProfessionalRow>;
}

const ProfessionalTable: React.FC<Props> = ({ data}) => {
  const navigate = useNavigate();

  const handleClick = ( e: React.MouseEvent<HTMLAnchorElement>, professional: Person) => {
    e.preventDefault();
    const email = professional.Email;
    navigate('/Profesionales/Profesional', {state:{email}});
  }

  return (
    <div className="ha-card ha-table-card">
      <div className="table-responsive">
        <table className="table ha-table align-middle m-0">
          <thead>
            <tr>
              <th>Profesional</th>
              <th className="d-lg-table-cell d-none">Contacto</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td className="px-3 px-xl-4">
                  <div className="d-flex align-items-center gap-3">
                    <Avatar name={item.Name} lastName={item.LastName} />
                    <div className="text-truncate">
                      <a href="#" className="ha-row-title" onClick={(e) => handleClick(e, item)}>{item.Name}, {item.LastName}</a>
                      {item.Tuition && <div className="ha-row-sub">Matrícula: {item.Tuition}</div>}
                    </div>
                  </div>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfessionalTable;
