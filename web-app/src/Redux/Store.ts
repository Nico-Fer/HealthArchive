import { configureStore } from "@reduxjs/toolkit";
import { ProfessionalForRedux } from "../Types/ProfessionalForRedux";
import { ProfessionalReducer} from "./States/professional";
import { SessionReducer, SessionState } from "./States/session";

export interface store{
    Professional : ProfessionalForRedux,
    Session : SessionState
}

export default configureStore<store>({
    reducer: {
        Professional : ProfessionalReducer,
        Session : SessionReducer
    }
})
