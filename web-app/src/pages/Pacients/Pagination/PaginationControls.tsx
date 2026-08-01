import React from 'react';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  shownCount?: number;
  totalCount?: number;
  itemsLabel?: string;
}

// Genera la ventana de números de página a mostrar (máximo 5) alrededor de la página actual.
const getPageWindow = (page: number, totalPages: number): number[] => {
  const maxButtons = 5;
  let start = Math.max(1, page - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);

  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
};

const PaginationControls: React.FC<Props> = ({ page, totalPages, onPageChange, shownCount, totalCount, itemsLabel = 'resultados' }) => {
  const hasCaption = shownCount !== undefined && totalCount !== undefined;

  if (totalPages <= 1 && !hasCaption) return null;

  const pages = getPageWindow(page, totalPages);

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 d-print-none">
      {hasCaption && (
        <span className="text-secondary">
          Mostrando <strong>{shownCount}</strong> de <strong>{totalCount}</strong> {itemsLabel}
        </span>
      )}
      {totalPages > 1 && (
      <nav aria-label="Paginación de pacientes">
      <ul className="pagination justify-content-center m-0">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Anterior
          </button>
        </li>

        {pages[0] > 1 && (
          <>
            <li className="page-item">
              <button className="page-link" onClick={() => onPageChange(1)}>1</button>
            </li>
            {pages[0] > 2 && (
              <li className="page-item disabled">
                <span className="page-link">…</span>
              </li>
            )}
          </>
        )}

        {pages.map((p) => (
          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
          </li>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && (
              <li className="page-item disabled">
                <span className="page-link">…</span>
              </li>
            )}
            <li className="page-item">
              <button className="page-link" onClick={() => onPageChange(totalPages)}>
                {totalPages}
              </button>
            </li>
          </>
        )}

        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
        </li>
      </ul>
      </nav>
      )}
    </div>
  );
};

export default PaginationControls;
