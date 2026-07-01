import React from 'react';

interface SpinnerProps {
  /** Texto opcional debajo del spinner */
  label?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ label = 'Cargando...' }) => (
  <div className="d-flex flex-column align-items-center justify-content-center py-5 w-100">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">{label}</span>
    </div>
    {label && <span className="mt-2 text-secondary">{label}</span>}
  </div>
);

export default Spinner;
