import { configureStore } from "@reduxjs/toolkit";
import { ProfessionalForRedux } from "../Types/ProfessionalForRedux";
import { ProfessionalReducer} from "./States/professional";

export interface Store{
    Professional : ProfessionalForRedux
}

export default configureStore<Store>({
    reducer: {
        Professional : ProfessionalReducer
    }
})