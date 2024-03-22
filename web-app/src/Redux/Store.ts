import { configureStore } from "@reduxjs/toolkit";
import { ProfessionalForRedux } from "../Types/ProfessionalForRedux";
import { ProfessionalReducer} from "./States/professional";

export interface store{
    Professional : ProfessionalForRedux
}

export default configureStore<store>({
    reducer: {
        Professional : ProfessionalReducer
    }
})