import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Estado del arranque de sesión, separado del perfil del profesional.
 *
 * Existe porque `Professional` se hidrata sincrónicamente desde localStorage al importar
 * el módulo: con solo mirarlo no se distingue "hay sesión" de "todavía no sabemos".
 * Esa ambigüedad era el bug — el navbar aparecía sobre el Login con la sesión vencida y
 * la app no redirigía a Pacientes con la sesión viva.
 *
 * - `checking`   → hay algo en localStorage y /Me todavía no contestó.
 * - `authenticated` → el server confirmó la cookie.
 * - `anonymous`  → no hay sesión.
 */
export type SessionStatus = 'checking' | 'authenticated' | 'anonymous';

/**
 * Por qué terminó la sesión, para que el Login lo explique. Un logout manual o el cierre
 * de la última pestaña no llevan motivo: no hay nada que explicar.
 * - `idle`    → cierre por inactividad (IdleWatcher).
 * - `expired` → el server ya no aceptó la sesión (falló el refresh).
 */
export type SessionEndReason = 'idle' | 'expired';

export interface SessionState {
  status: SessionStatus;
  endedReason: SessionEndReason | null;
}

const initialState: SessionState = {
  status: localStorage.getItem('Professional') ? 'checking' : 'anonymous',
  endedReason: null,
};

export const SessionSlice = createSlice({
  name: 'Session',
  initialState,
  reducers: {
    sessionAuthenticated: (state) => {
      state.status = 'authenticated';
      state.endedReason = null;
    },
    sessionAnonymous: (state, action: PayloadAction<SessionEndReason | null | undefined>) => {
      state.status = 'anonymous';
      state.endedReason = action.payload ?? null;
    },
  },
});

export const { sessionAuthenticated, sessionAnonymous } = SessionSlice.actions;

export const SessionReducer = SessionSlice.reducer;
