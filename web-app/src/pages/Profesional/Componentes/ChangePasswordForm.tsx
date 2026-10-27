import React, { useState } from 'react';

import { ApiError, apiFetch } from '../../../api/client';
import { PASSWORD_MIN_LENGTH } from '../../../Functions/passwordPolicy';
import { touchSession } from '../../../lib/session';
import logger, { describeError } from '../../../lib/logger';

interface PasswordForm {
  CurrentPassword: string;
  NewPassword: string;
  RepeatPassword: string;
}

const EMPTY_FORM: PasswordForm = { CurrentPassword: '', NewPassword: '', RepeatPassword: '' };

const ERROR_BY_SLUG: Record<string, string> = {
  incorrect_password: 'La contraseña actual no es correcta.',
  weak_password: `La contraseña nueva tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
};

// Solo se muestra en el perfil propio (lo decide FormProfesional): el endpoint cambia la
// contraseña del doctor logueado, no la del perfil que se está mirando.
const ChangePasswordForm: React.FC = () => {
  const [formData, setFormData] = useState<PasswordForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    setSuccess(false);
  };

  const validate = (): string => {
    if (!formData.CurrentPassword || !formData.NewPassword) return 'Completá la contraseña actual y la nueva.';
    if (formData.NewPassword.length < PASSWORD_MIN_LENGTH) return ERROR_BY_SLUG.weak_password;
    if (formData.NewPassword !== formData.RepeatPassword) return 'Las contraseñas nuevas no coinciden.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      // apiFetch y no apiPost: responde 204 sin cuerpo y apiPost espera JSON.
      const res = await apiFetch('/api/AuthService/ChangePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CurrentPassword: formData.CurrentPassword, NewPassword: formData.NewPassword }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => undefined);
        const slug = new ApiError(res.status, body).slug;
        setError((slug && ERROR_BY_SLUG[slug]) || 'No se pudo cambiar la contraseña. Intentá de nuevo.');
        return;
      }

      // El server cerró las otras sesiones y emitió un par de tokens nuevo para esta,
      // con la ventana de inactividad completa.
      touchSession();
      setFormData(EMPTY_FORM);
      setSuccess(true);
    } catch (err) {
      logger.error('No se pudo cambiar la contraseña', describeError(err));
      setError('No se pudo cambiar la contraseña. Intentá de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mt-4 pt-4 border-top">
      <h2 className="profesional-form-title">Cambiar contraseña</h2>
      <form onSubmit={handleSubmit} className="ha-form">
        <div className="ha-form-field">
          <label htmlFor="CurrentPassword">Contraseña actual</label>
          <input
            type="password"
            className="form-control"
            id="CurrentPassword"
            name="CurrentPassword"
            autoComplete="current-password"
            value={formData.CurrentPassword}
            onChange={handleChange}
          />
        </div>

        <div className="ha-form-row">
          <div className="ha-form-field">
            <label htmlFor="NewPassword">Contraseña nueva</label>
            <input
              type="password"
              className="form-control"
              id="NewPassword"
              name="NewPassword"
              autoComplete="new-password"
              value={formData.NewPassword}
              onChange={handleChange}
            />
          </div>

          <div className="ha-form-field">
            <label htmlFor="RepeatPassword">Repetir contraseña nueva</label>
            <input
              type="password"
              className="form-control"
              id="RepeatPassword"
              name="RepeatPassword"
              autoComplete="new-password"
              value={formData.RepeatPassword}
              onChange={handleChange}
            />
          </div>
        </div>

        {error && <div className="ha-form-error" role="alert">{error}</div>}
        {success && (
          <div className="alert alert-success" role="status">
            Contraseña actualizada. Se cerraron tus sesiones en otros navegadores y dispositivos.
          </div>
        )}

        <div className="ha-form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            Cambiar contraseña
          </button>
        </div>
      </form>
    </section>
  );
};

export default ChangePasswordForm;
