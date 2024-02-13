
import './Table.scss';

import {Person, Patient} from "../../../Types/Person"

import { FaWhatsapp } from 'react-icons/fa';

interface Props {
    data: Array<Patient | Person>;
    type: 'patients' | 'professionals';
  }

const Table : React.FC<Props> = ({ data, type }) => {
  return (
    <div className="table-container" style={{maxWidth: '1140px', marginLeft: 'auto', marginRight: 'auto', width: '100%', display: 'block', boxSizing: 'border-box', backgroundColor: '#EAEAEA'}}>
        <div className="shadow-sm rounded bg-white table-responsive">
            <table className="table align-middle m-0">
                <thead>
                <tr>
                    <th>Nombre</th>
                    {type === 'patients' && <th>Obra Social</th>}
                    <th>Contacto</th>
                    {type === 'patients' && <th>HCE</th>}
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => (
                    <tr className="bg-white" key={index}>
                    <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3">
                        <div className="text-truncate">
                            {item.name}, {item.lastName}
                        </div>
                        {type === 'patients' && <div className='form-text m-0'>{(item as Patient).dni}</div>}
                    </td>
                    {type === 'patients' &&
                        <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3 d-lg-table-cell d-none">
                            {(item as Patient).medicalCoverage.Number !== "" && <div className='d-flex'>
                                <div>
                                    <div>{(item as Patient).medicalCoverage.Number}</div>
                                    <div className='form-text m-0'>{(item as Patient).medicalCoverage.Coverage}</div>
                                </div>
                            </div>}
                        </td>
                    }
                    <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3 d-lg-table-cell d-none">
                        <div className='d-flex align-items-center'>
                            <div>
                                {item.phoneNumber.PhoneNumber !== '' && <div className='phone-number'>
                                    <FaWhatsapp className="whatsapp-icon" />
                                    <span>{item.phoneNumber.CountryCode} {item.phoneNumber.PhoneNumber}</span>
                                </div>}
                                {item.email !== '' && <div>
                                    <a href={`mailto:${item.email}`} style={{ fontSize: '15px', textDecoration: 'none' }}>{item.email}</a>
                                </div>}
                            </div>
                        </div>
                    </td>
                    {type === 'patients' && 
                        <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3">
                            <button className="btn btn-primary">HCE</button>
                        </td>
                    }
                    </tr>
                ))}
                </tbody>
            </table>
      </div>
    </div>
  );
};

export default Table;