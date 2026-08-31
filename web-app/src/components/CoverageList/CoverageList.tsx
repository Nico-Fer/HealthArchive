import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';

import { MedicalCoverage } from '../../Types/MedicalCoverage';
import './CoverageList.scss';

interface CoverageListProps {
    /** Coberturas en orden. La primera es la principal. */
    value: MedicalCoverage[];
    onChange: (coberturas: MedicalCoverage[]) => void;
}

export const emptyCoverage = (order: number): MedicalCoverage =>
    ({ Coverage: '', Number: '', Order: order });

/**
 * Lista editable de coberturas de un paciente. Reemplaza al par de inputs fijo que estaba
 * duplicado en NewPatient y en FormPaciente.
 *
 * El orden del array ES el dato: la primera fila es la cobertura principal, que es la que
 * se muestra en el listado de pacientes. El campo Order se mantiene sincronizado con la
 * posición en cada cambio, aunque el backend igual lo reasigna al guardar.
 */
const CoverageList: React.FC<CoverageListProps> = ({ value, onChange }) => {

    // Siempre se muestra al menos una fila: un formulario de alta sin ningún campo de
    // cobertura obliga a descubrir el botón "Agregar" para cargar lo más habitual.
    const filas = value.length > 0 ? value : [emptyCoverage(0)];

    const reindexar = (coberturas: MedicalCoverage[]) =>
        coberturas.map((c, i) => ({ ...c, Order: i }));

    const actualizar = (index: number, campo: 'Coverage' | 'Number', valor: string) => {
        onChange(reindexar(filas.map((c, i) => (i === index ? { ...c, [campo]: valor } : c))));
    };

    const agregar = () => onChange(reindexar([...filas, emptyCoverage(filas.length)]));

    const quitar = (index: number) => {
        const restantes = filas.filter((_, i) => i !== index);
        // Nunca se queda sin filas: si se borra la última, queda una vacía. Una lista
        // vacía no se puede volver a llenar sin el botón de agregar.
        onChange(reindexar(restantes.length > 0 ? restantes : [emptyCoverage(0)]));
    };

    return (
        <div className="coverage-list">
            {filas.map((cobertura, index) => (
                <div className="coverage-list-row" key={index}>
                    <div className="ha-form-field">
                        <label htmlFor={`Coverage-${index}`}>
                            {index === 0 ? 'Cobertura y Plan (principal)' : 'Cobertura y Plan'}
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            id={`Coverage-${index}`}
                            name={`Coverage-${index}`}
                            placeholder="Escribir cobertura y plan"
                            value={cobertura.Coverage}
                            onChange={(e) => actualizar(index, 'Coverage', e.target.value)}
                        />
                    </div>
                    <div className="ha-form-field">
                        <label htmlFor={`CoverageNumber-${index}`}>Nro. de Cobertura</label>
                        <input
                            type="text"
                            className="form-control"
                            id={`CoverageNumber-${index}`}
                            name={`CoverageNumber-${index}`}
                            placeholder="Escribir el número"
                            value={cobertura.Number}
                            onChange={(e) => actualizar(index, 'Number', e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm coverage-list-remove"
                        aria-label={`Quitar cobertura ${index + 1}`}
                        onClick={() => quitar(index)}
                    >
                        <FaTrash aria-hidden="true" />
                    </button>
                </div>
            ))}

            <button type="button" className="btn btn-ghost btn-sm coverage-list-add" onClick={agregar}>
                <FaPlus aria-hidden="true" /> Agregar cobertura
            </button>
        </div>
    );
};

export default CoverageList;
