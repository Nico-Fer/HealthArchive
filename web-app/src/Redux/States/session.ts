import { createSlice } from '@reduxjs/toolkit';

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

export interface SessionState {
  status: SessionStatus;
}

const initialState: SessionState = {
  status: localStorage.getItem('Professional') ? 'checking' : 'anonymous',
};

export const SessionSlice = createSlice({
  name: 'Session',
  initialState,
  reducers: {
    sessionAuthenticated: (state) => {
      state.status = 'authenticated';
    },
    sessionAnonymous: (state) => {
      state.status = 'anonymous';
    },
  },
});

export const { sessionAuthenticated, sessionAnonymous } = SessionSlice.actions;

export const SessionReducer = SessionSlice.reducer;
