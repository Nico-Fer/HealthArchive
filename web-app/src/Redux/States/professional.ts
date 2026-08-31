import { createSlice } from "@reduxjs/toolkit";
import { ProfessionalForRedux } from "../../Types/ProfessionalForRedux";
import { apiFetch } from "../../api/client";
import { sessionAnonymous } from "./session";
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
export const logout = () => async (dispatch: any) => {
    try {
        await apiFetch('/api/AuthService/Logout', { method: 'POST' });
    } catch {
        // Ignore network errors: we still clear the local session below.
    }
    dispatch(resetProfessionalRed());
    dispatch(sessionAnonymous());
};

export const ProfessionalReducer = ProfessionalSlice.reducer;