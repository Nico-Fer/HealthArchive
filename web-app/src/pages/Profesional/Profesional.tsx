// MainPage.tsx
import React from 'react';
import MyForm from './Componentes/FormProfesional';
import './Profesional.scss';

const MainPage: React.FC = () => {
  return (
    <div className="main-page">
      <header>
        <h1>Profesional</h1>
        {/* Aquí podrías agregar una barra de navegación si lo deseas */}
      </header>
      <div className="content">
        <MyForm />
      </div>
    </div>
  );
};

export default MainPage;
