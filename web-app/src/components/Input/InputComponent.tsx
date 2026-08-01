import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

import './InputComponent.scss';

interface InputProps {
    type: string;
    id: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    label?: string;
    icon?: React.ReactNode;
};

const InputComponent : React.FC<InputProps> = (props) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = props.type === 'password';
    const inputType = isPassword && showPassword ? 'text' : props.type;

    return(
        <div className="ha-input">
            {props.label && <label htmlFor={props.id} className="ha-input-label">{props.label}</label>}
            <div className="ha-input-wrapper">
                {props.icon && <span className="ha-input-icon" aria-hidden="true">{props.icon}</span>}
                <input
                    className={`form-control ${props.icon ? 'has-icon' : ''}`}
                    type={inputType}
                    id={props.id}
                    value={props.value}
                    onChange={props.onChange}
                    placeholder={props.placeholder}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="ha-input-eye"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputComponent;
