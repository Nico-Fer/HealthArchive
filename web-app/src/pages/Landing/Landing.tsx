import { useEffect, useRef } from 'react';
import useReveal from './useReveal';
import Header from './sections/Header';
import Hero from './sections/Hero';
import Features from './sections/Features';
import Workflow from './sections/Workflow';
import Security from './sections/Security';
import Manifesto from './sections/Manifesto';
import Footer from './sections/Footer';

import './Landing.scss';

// Página pública: no lee el store ni llama al API. Todo su CSS cuelga de .landing para no
// filtrarse a la app cuando el usuario sigue navegando a /Login.
const Landing = () => {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);

  useEffect(() => {
    const previous = document.title;
    document.title = 'HealthArchive | Historia clínica electrónica para consultorios';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="landing" ref={root}>
      <Header />
      <main>
        <Hero />
        <Features />
        <Workflow />
        <Security />
        <Manifesto />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
