import { useState } from "react";
import { FormErrors } from "../Types/FormErrors";

const useForm = (onValidate : () => FormErrors) => {

    const [errors, setErrors] = useState(null);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

    }

    return { errors, handleSubmit };
}

export default useForm;