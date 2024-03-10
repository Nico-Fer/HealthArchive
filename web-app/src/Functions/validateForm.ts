import { Person, Patient} from "../Types/Person";
import { FormErrors } from "../Types/FormErrors";



const validateForm =  (personData : Person | Patient) : FormErrors =>{
    const regexLetrasEspacios = /^[A-Za-z\s]+$/;
    const regexSoloNumeros = /^([0-9])*$/;
    const newErrors : FormErrors = {};

    if (!personData.Name.trim()) {
      newErrors.Name = 'El nombre es obligatorio.';
    }else if(!regexLetrasEspacios.test(personData.Name)){
      newErrors.Name = 'El nombre solo puede contener letras o espacios';
    }

    if (!personData.LastName.trim()) {
      newErrors.LastName = 'El apellido es obligatorio.'
    }else if(!regexLetrasEspacios.test(personData.LastName)){
      newErrors.LastName = 'El apellido solo puede contener letras o espacios';
    }

    if ('DNI' in personData){
        if (!personData.DNI.trim()) {
            newErrors.DNI = 'El DNI es obligatorio.';
        }else if(!regexSoloNumeros.test(personData.DNI)){
            newErrors.DNI = 'El DNI solo puede contener números';
        }else if(personData.DNI.length < 8 || personData.DNI.length > 8){
            newErrors.DNI = 'El DNI debe contener 8 números';
        }
    }

    if(personData.Email.trim() && !personData.Email.includes('@')){
      newErrors.Email = 'Email no válido';
    }

    return newErrors;
  }

  export default validateForm;