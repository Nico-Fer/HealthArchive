import { RefObject, useEffect } from 'react';

// Marca con .is-visible, una sola vez, cada [data-reveal] del contenedor cuando entra en
// pantalla. Con prefers-reduced-motion el CSS ya los muestra quietos, así que no observa.
const useReveal = (root: RefObject<HTMLElement>) => {
  useEffect(() => {
    const container = root.current;
    if (!container) return;

    const targets = container.querySelectorAll<HTMLElement>('[data-reveal]');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [root]);
};

export default useReveal;
