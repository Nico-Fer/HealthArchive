import { createSlice } from "@reduxjs/toolkit";
import { ProfessionalForRedux } from "../../Types/ProfessionalForRedux";
import { apiFetch } from "../../api/client";

export const EmptyProfessionalState : ProfessionalForRedux ={
    name: '',
    lastName: '',
    email: '',
    tuition: '',
    role: '',
}

export const persistLocalStorage = (info : ProfessionalForRedux) => {
    localStorage.setItem('Professional', JSON.stringify({...info}))
}

export const ProfessionalSlice = createSlice({
    name: 'Professional',
    initialState: localStorage.getItem('Professional') ?  JSON.parse(localStorage.getItem('Professional') as string ) : EmptyProfessionalState,
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
};

export const ProfessionalReducer = ProfessionalSlice.reducer;