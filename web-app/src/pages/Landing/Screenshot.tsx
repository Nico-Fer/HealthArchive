// Capturas reales de la app. Se resuelven con glob para que alcance con dejar el archivo
// en src/assets/landing/ (pacientes, hce, evolucion, pdf; .png, .jpg o .webp): si falta,
// se muestra un placeholder del mismo tamaño y la página no salta al aparecer la imagen.
const shots = import.meta.glob<string>('../../assets/landing/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
});

const findShot = (name: string) =>
  Object.entries(shots).find(([path]) => path.split('/').pop()?.split('.')[0] === name)?.[1];

interface Props {
  name: 'pacientes' | 'hce' | 'evolucion' | 'pdf';
  alt: string;
  className?: string;
  eager?: boolean;
}

const Screenshot = ({ name, alt, className = '', eager = false }: Props) => {
  const src = findShot(name);

  return (
    <figure className={`lp-shot ${className}`}>
      <div className="lp-shot-bar" aria-hidden="true">
        <span /><span /><span />
      </div>
      {src ? (
        <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      ) : (
        // TODO: captura real en src/assets/landing/{name}.png (16:10, ~1600x1000)
        <div className="lp-shot-placeholder" role="img" aria-label={alt}>
          <span>{`src/assets/landing/${name}.png`}</span>
        </div>
      )}
    </figure>
  );
};

export default Screenshot;
