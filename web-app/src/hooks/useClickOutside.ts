import { RefObject, useEffect } from 'react';

/**
 * Llama a `handler` cuando se hace click fuera de todos los elementos referenciados.
 *
 * Recibe varias refs porque un popover puede vivir en un portal: el disparador y el panel
 * están en subárboles distintos del DOM y ninguno "contiene" al otro.
 *
 * Escucha `mousedown` y no `click`: si un botón de adentro del panel se desmonta al
 * soltar el mouse, el `click` termina disparándose con el target ya fuera del árbol.
 */
export const useClickOutside = (
  refs: RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled = true,
) => {
  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const isInside = refs.some((ref) => ref.current?.contains(target));
      if (!isInside) handler();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, handler, ...refs]);
};

export default useClickOutside;
