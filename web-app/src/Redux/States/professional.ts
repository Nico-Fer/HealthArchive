import { createSlice } from "@reduxjs/toolkit";
import { ProfessionalForRedux } from "../../Types/ProfessionalForRedux";

export const EmptyProfessionalState : ProfessionalForRedux ={
    name: '',
    lastName: '',
    email: '',
    tuition: '',
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

export const ProfessionalReducer = ProfessionalSlice.reducer;