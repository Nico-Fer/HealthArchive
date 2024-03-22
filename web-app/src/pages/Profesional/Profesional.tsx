
import React from 'react';
import MyForm from './Componentes/FormProfesional';
import './Profesional.scss';

const MainPage: React.FC = () => {
  return (
    <div className="main-page">     
      <div className="content">
        <MyForm />
      </div>
    </div>
  );
};

export default MainPage;
