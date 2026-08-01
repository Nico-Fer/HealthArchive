import React from 'react';

import './ConfirmDialog.scss';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title,
    message,
    confirmLabel = 'Borrar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
}) => {
    return (
        <div className="ha-confirm-backdrop" onClick={onCancel}>
            <div
                className="ha-confirm-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ha-confirm-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="ha-confirm-title" className="ha-confirm-title">{title}</h2>
                <p className="ha-confirm-message">{message}</p>
                <div className="ha-confirm-actions">
                    <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
