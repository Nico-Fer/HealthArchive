
import './Table.scss';

import {Person, Pacient} from "../../../Types/Person"

interface Props {
    data: Array<Pacient | Person>;
    type: 'pacients' | 'professionals';
  }

const Table : React.FC<Props> = ({ data, type }) => {
  return (
    <div className="tabla-container" style={{maxWidth: '1140px'}}>
        <div className="shadow-sm rounded bg-white table-responsive">
            <table className="table align-middle m-0">
                <thead>
                <tr>
                    <th>Nombre</th>
                    {type === 'pacients' && <th>Obra Social</th>}
                    <th>Contacto</th>
                    {type === 'pacients' && <th>HCE</th>}
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => (
                    <tr className="bg-white" key={index}>
                    <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3">{item.name}</td>
                    {type === 'pacients' &&
                        <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3 d-lg-table-cell d-none">
                            {(item as Pacient).medicalCoverage}
                        </td>
                    }
                    <td className="p-2 px-md3 py-md-2 px-xl-4 py-xl-3 d-lg-table-cell d-none">{item.phoneNumber}</td>
                    {type === 'pacients' && 
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