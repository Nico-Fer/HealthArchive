import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";

import Login from "../Login/Login";
import Register from "../Register/Register";

import Pacients from "../Pacients";
import Profesional from "../Profesional";
import Patients from "../Pacients";
import NavBar from "./NavBar/NavBar";

import "./App.scss";
import Proffesionals from "../Professionals";
import HistoriaClinica from "../HistoriaClinica/HistoriaClinica";
import NewPatient from "../NewPatient";
import AuthGuard from "../../Guards";
import { Provider } from "react-redux";
import  store  from "../../Redux/Store";
import AuthBootstrap from "./AuthBootstrap";

const App = () => {

  return (
    <div>
      <Provider store={store}>
        <BrowserRouter>
            <AuthBootstrap/>
            <NavBar/>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/Login" element={<Login />} />
              <Route path="/Register" element={<Register />} />
              <Route element={<AuthGuard />}>
                <Route path="/Pacientes" element={<Patients />} />
                <Route path="/Pacientes/Nuevo" element={<NewPatient />} />
                <Route path="/Profesionales" element={<Proffesionals />} />
                <Route path="/Profesionales/Profesional" element={<Profesional />} />
                <Route path="/Pacientes/HistoriaClinica" element={<HistoriaClinica />} />
              </Route>
            </Routes>
        </BrowserRouter>
      </Provider>
    </div>
  );
};

export default App;