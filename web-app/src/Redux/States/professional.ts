import { createSlice } from "@reduxjs/toolkit";
import { ProfessionalForRedux } from "../../Types/ProfessionalForRedux";
import { apiFetch } from "../../api/client";
import { sessionAnonymous, SessionEndReason } from "./session";
import { broadcastLogout, clearSessionTouch, clearTabSession } from "../../lib/session";
import logger from "../../lib/logger";

export const EmptyProfessionalState : ProfessionalForRedux ={
    id: '',
    name: '',
    lastName: '',
    email: '',
    tuition: '',
    role: '',
}

export const persistLocalStorage = (info : ProfessionalForRedux) => {
    localStorage.setItem('Professional', JSON.stringify({...info}))
}

// Con try/catch: un valor corrupto en localStorage rompía el bundle en tiempo de import,
// y el usuario quedaba con una pantalla en blanco imposible de recuperar sin DevTools.
const readPersistedProfessional = () : ProfessionalForRedux => {
    const stored = localStorage.getItem('Professional');
    if (!stored) return EmptyProfessionalState;

    try {
        return JSON.parse(stored) as ProfessionalForRedux;
    } catch {
        logger.warn('El profesional guardado en localStorage no es JSON válido; se descarta');
        localStorage.removeItem('Professional');
        return EmptyProfessionalState;
    }
}

export const ProfessionalSlice = createSlice({
    name: 'Professional',
    initialState: readPersistedProfessional(),
    reducers:{
        createProfessionalRed: (state, action) => {
            persistLocalStorage(action.payload);
            return action.payload;
        },

        updateProfessionalRed: (state, action) => {
            const result = {...state, ...action.payload};
            persistLocalStorage(result);
            return result
        },

        resetProfessionalRed: () => {
            localStorage.removeItem('Professional');
            return EmptyProfessionalState
        }
    }
});

export const {createProfessionalRed, updateProfessionalRed, resetProfessionalRed} = ProfessionalSlice.actions;

// Thunk: revokes the refresh token server-side (clears the httpOnly cookies) and
// then wipes the local session. Redux Toolkit ships thunk middleware by default.
// `reason` lo usa el cierre por inactividad para que el Login explique qué pasó; las otras
// pestañas se enteran por BroadcastChannel y se cierran sin volver a llamar al API.
export const logout = (reason: SessionEndReason | null = null) => async (dispatch: any) => {
    try {
        // Logout es anónimo en el API, así que nunca da 401: no hay refresh ni redirect.
        await apiFetch('/api/AuthService/Logout', { method: 'POST' }, { redirectOnAuthFailure: false });
    } catch {
        // Ignore network errors: we still clear the local session below.
    }
    clearTabSession();
    clearSessionTouch();
    broadcastLogout(reason);
    dispatch(resetProfessionalRed());
    dispatch(sessionAnonymous(reason));
};

export const ProfessionalReducer = ProfessionalSlice.reducer;