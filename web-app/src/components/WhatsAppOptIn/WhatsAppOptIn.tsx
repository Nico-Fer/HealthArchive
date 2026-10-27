import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

import './WhatsAppOptIn.scss';

interface WhatsAppOptInProps {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Sin celular cargado no hay a dónde mandar: el checkbox queda deshabilitado. */
    hasPhone: boolean;
    label?: string;
}

/**
 * Consentimiento para recordatorios por WhatsApp. La política de WhatsApp Business exige
 * opt-in explícito: tener el celular cargado no alcanza, por eso arranca desmarcado.
 */
const WhatsAppOptIn: React.FC<WhatsAppOptInProps> = ({
    id,
    checked,
    onChange,
    hasPhone,
    label = 'Acepta recordatorios de turnos por WhatsApp',
}) => {
    return (
        <div className="form-check ha-whatsapp-optin">
            <input
                type="checkbox"
                className="form-check-input"
                id={id}
                checked={checked && hasPhone}
                disabled={!hasPhone}
                onChange={(e) => onChange(e.target.checked)}
            />
            <label className="form-check-label" htmlFor={id}>
                <FaWhatsapp aria-hidden="true" /> {label}
            </label>
            {!hasPhone && <div className="ha-whatsapp-optin-hint">Cargá un celular para poder activarlo.</div>}
        </div>
    );
};

export default WhatsAppOptIn;
