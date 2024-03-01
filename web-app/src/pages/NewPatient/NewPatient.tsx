import { useState } from 'react';
import { Patient } from '../../Types/Person';
import { Phone } from '../../Types/Phone';

import './NewPatient.scss'

const NewPatient = () => {

    const [patientData, setPatientData] = useState<Patient>({
      name: '',
      lastName: '',
      phoneNumber: { CountryCode: '', PhoneNumber: '' }, 
      email: '',
      medicalCoverage: {Number: '', Coverage: ''},
      dni: '',
      country: '',
      ocupation: '',
      address: '',
      birthDate: new Date(),
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setPatientData(prevData => ({
          ...prevData,
          [name]: value,
      }));

      console.log(patientData);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    const dateObject = new Date(dateString);
  
    setPatientData(prevData => ({
      ...prevData,
      birthDate: dateObject
    }));
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    let year = d.getFullYear();
  
    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;
  
    return [year, month, day].join('-');
  };

  const formatPhoneNumber = (phoneNumber: Phone) => {
    
  }

    return (
        <div className="page-container" style={{backgroundColor: '#EAEAEA'}}>
          <div className="form-container">
            <form  className="form">
              <div className="form-group">
                <label htmlFor="nombre">Nombre:</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={patientData.name}
                  onChange={handleChange}
                />
              </div>
    
              <div className="form-group">
                <label htmlFor="apellido">Apellido:</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={patientData.lastName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dni">DNI:</label>
                <input
                  type="text"
                  id="documento"
                  name="documento"
                  value={patientData.dni}
                  onChange={handleChange}
                />
              </div>
    
              <div className="form-group">
                <label htmlFor="fechaNacimiento">Fecha de Nacimiento:</label>
                <input
                  type="date"
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  value={formatDate(patientData.birthDate)}
                  onChange={handleDateChange}
                />
              </div>

              <div className="form-group"> 
                <label htmlFor="dni">Pais:</label>
                <input
                  type="text"
                  id="pais"
                  name="pais"
                  placeholder='Escriba el pais'
                  value={patientData.country}
                  onChange={handleChange}
                />
              </div> 

              <div className = "mb-3">
                <div className='d-flex align-items-center form-label'>
                  <label>Cobertura</label>
                </div>
                <div className='d-flex mb-2'>
                    <div className='flex-fill'>
                      <label htmlFor="coberturaParte1"></label>
                      <input
                        type="text"
                        id="cobertura"
                        name="cobertura"
                        placeholder='Escribir cobertura y plan'
                        value={patientData.medicalCoverage.Coverage}
                        onChange={handleChange}
                      />
                    </div>
                    <div className='flex-md-fill ms-2 position-relative'>
                      <label htmlFor="coberturaParte2"></label>
                      <input
                        type="text"
                        id="numeroCobertura"
                        name="numeroCobertura"
                        placeholder='Escribir el número'
                        value={patientData.medicalCoverage.Number}
                        onChange={handleChange}
                      />
                    </div>
                </div>
              </div>
              
    
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  placeholder='Direccion de Email'
                  value={patientData.email}
                  onChange={handleChange}
                />
              </div>
    
              <div className='mb-3'>
                <div className="position-relative">
                  <div className='d-flex mb-2'>
                    <div className='flex-fill'>
                      <select className='PhoneCountry'>
                        <option value = 'AR'> Argentina </option>
                      </select>
                    </div>
                     <input
                        type="text"
                        id="phone"
                        name="phone"
                        placeholder='+54 '
                        value={formatPhoneNumber(patientData.phoneNumber)}
                        onChange={handleChange}
                      />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ocupacion">Ocupacion:</label>
                <input
                  type="text"
                  id="ocupacion"
                  name="ocupacion"
                />
              </div>

              <div className="form-group">
                <label htmlFor="direccion">Direccion:</label>
                <input
                  type="text"
                  id="direccion"
                  name="direccion"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notas">Notas:</label>
                <input
                  type="text"
                  id="notas"
                  name="notas"
                />
              </div>
    
              <div className="form-group">
                <div className="buttons-container">
                <button type="submit" className="submit-btn">Guardar</button>
                  
                  <button className="close-btn">
                    Cerrar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
    );
}

export default NewPatient;