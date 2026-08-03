import { Routes, Route, BrowserRouter } from "react-router-dom";

import Login from "../Login/Login";
import Register from "../Register/Register";

import Profesional from "../Profesional";
import Patients from "../Pacients";
import NavBar from "./NavBar/NavBar";

import "./App.scss";
import Proffesionals from "../Professionals";
import HistoriaClinica from "../HistoriaClinica/HistoriaClinica";
import NewPatient from "../NewPatient";
import AuthGuard, { PublicGuard } from "../../Guards";
import ErrorBoundary from "../../components/ErrorBoundary";
import { Provider } from "react-redux";
import  store  from "../../Redux/Store";
import AuthBootstrap from "./AuthBootstrap";

const App = () => {

  return (
    <div>
      <Provider store={store}>
        <BrowserRouter>
            {/* AuthBootstrap va adentro del Router (usa useNavigate) y envuelve todo:
                nada se renderiza hasta saber si la sesión está viva. */}
            <AuthBootstrap>
              <NavBar/>
              {/* Adentro del Router para que el fallback conserve la navegación. */}
              <ErrorBoundary>
                <Routes>
                  <Route element={<PublicGuard />}>
                    <Route path="/" element={<Login />} />
                    <Route path="/Login" element={<Login />} />
                    <Route path="/Register" element={<Register />} />
                  </Route>
                  <Route element={<AuthGuard />}>
                    <Route path="/Pacientes" element={<Patients />} />
                    <Route path="/Pacientes/Nuevo" element={<NewPatient />} />
                    <Route path="/Profesionales" element={<Proffesionals />} />
                    <Route path="/Profesionales/Profesional" element={<Profesional />} />
                    <Route path="/Pacientes/HistoriaClinica" element={<HistoriaClinica />} />
                  </Route>
                </Routes>
              </ErrorBoundary>
            </AuthBootstrap>
        </BrowserRouter>
      </Provider>
    </div>
  );
};

export default App;
