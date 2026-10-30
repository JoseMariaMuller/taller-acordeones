// Taller de acordeones — comportamiento del sitio.
// Cabecera fija, menú hamburguesa y sección activa en el menú; el resto se suma sección por sección.

const cabecera = document.querySelector('.cabecera');

// Alto de la cabecera fija, para que las anclas y el foco no queden tapados.
if (cabecera) {
  const medir = () => document.documentElement.style.setProperty('--alto-cabecera', `${cabecera.offsetHeight}px`);
  medir();
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(cabecera);
  else window.addEventListener('resize', medir);
}

// Menú hamburguesa: sin JavaScript el menú queda siempre visible.
(() => {
  const boton = document.querySelector('.hamburguesa');
  const menu = document.querySelector('#menu-principal');
  if (!boton || !menu) return;

  const escritorio = window.matchMedia('(min-width: 62rem)');
  const estaAbierto = () => boton.getAttribute('aria-expanded') === 'true';

  const abrir = (abierto) => {
    boton.setAttribute('aria-expanded', String(abierto));
    menu.classList.toggle('menu--cerrado', !abierto);
  };

  abrir(false);
  boton.addEventListener('click', () => abrir(!estaAbierto()));
  menu.addEventListener('click', (evento) => {
    if (evento.target.closest('a')) abrir(false);
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && estaAbierto()) {
      abrir(false);
      boton.focus();
    }
  });
  // Tocar fuera del menú también lo cierra.
  document.addEventListener('click', (evento) => {
    if (estaAbierto() && !evento.target.closest('.menu, .hamburguesa')) abrir(false);
  });
  escritorio.addEventListener('change', () => abrir(false));
})();

// Subrayado del menú: muestra en qué sección estás.
// Se calcula por posición de scroll (no por visibilidad), así también funciona
// con la última sección, que puede ser corta y no llegar nunca a la parte alta.
(() => {
  const enlaces = [...document.querySelectorAll('.menu a[href^="#"]')];
  const pares = enlaces
    .map((enlace) => ({ enlace, seccion: document.querySelector(enlace.getAttribute('href')) }))
    .filter((par) => par.seccion);
  if (pares.length === 0) return;

  const marcar = (activo) => {
    pares.forEach(({ enlace }) => {
      if (enlace === activo) enlace.setAttribute('aria-current', 'location');
      else enlace.removeAttribute('aria-current');
    });
  };

  const calcular = () => {
    const alAlFinal = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (alAlFinal) return pares[pares.length - 1].enlace;
    const linea = (cabecera ? cabecera.offsetHeight : 0) + window.innerHeight * 0.25;
    let activo = pares[0].enlace;
    pares.forEach(({ enlace, seccion }) => {
      if (seccion.getBoundingClientRect().top <= linea) activo = enlace;
    });
    return activo;
  };

  // Al tocar un enlace se marca enseguida y se espera a que termine el desplazamiento.
  let bloqueado = false;
  let temporizador;
  const liberar = () => {
    bloqueado = false;
    marcar(calcular());
  };

  let pendiente = false;
  const alScroll = () => {
    if (bloqueado) {
      clearTimeout(temporizador);
      temporizador = setTimeout(liberar, 150);
      return;
    }
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      marcar(calcular());
    });
  };

  pares.forEach(({ enlace }) => {
    enlace.addEventListener('click', () => {
      marcar(enlace);
      bloqueado = true;
      clearTimeout(temporizador);
      temporizador = setTimeout(liberar, 150);
    });
  });

  window.addEventListener('scroll', alScroll, { passive: true });
  window.addEventListener('resize', alScroll);
  marcar(calcular());
})();
