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

// Ilustración de la portada: se trae el SVG a la página para poder animar sus piezas.
// Si algo falla (por ejemplo, abrir el archivo sin servidor), queda la imagen común.
(() => {
  const img = document.querySelector('.portada__figura img');
  if (!img || !window.fetch || !window.DOMParser) return;
  // Abierto con doble clic (file://) el navegador no deja leer el SVG: queda la imagen común.
  if (window.location.protocol === 'file:') return;

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const escritorio = window.matchMedia('(min-width: 62rem)');

  fetch(img.currentSrc || img.src)
    .then((respuesta) => (respuesta.ok ? respuesta.text() : Promise.reject(new Error('sin SVG'))))
    .then((texto) => {
      const documento = new DOMParser().parseFromString(texto, 'image/svg+xml');
      if (documento.querySelector('parsererror') || documento.documentElement.nodeName !== 'svg') return;

      const svg = document.importNode(documento.documentElement, true);
      svg.setAttribute('aria-label', img.alt);
      const caja = document.createElement('div');
      caja.className = 'dibujo';
      caja.append(svg);
      img.replaceWith(caja);

      // Mismo recorte que hacía object-fit: cover sobre la imagen.
      const encuadrar = () => svg.setAttribute('viewBox', escritorio.matches ? '0 30 900 540' : '189 0 600 600');
      encuadrar();
      escritorio.addEventListener('change', encuadrar);

      // Recorre los tres servicios (fuelle, afinación y estuche) y se repite con una pausa en el medio.
      // Como se mueve sola por más de 5 s, lleva un botón para pausarla (WCAG 2.2.2).
      // Se detiene sola si el dibujo sale de pantalla o si cambiás de pestaña.
      const modos = ['fuelle', 'afinacion', 'estuche'];
      let corriendo = false;
      let pausadaPorLaPersona = false;
      let enPantalla = true;
      let temporizador;

      const puedeCorrer = () => !pausadaPorLaPersona && enPantalla && !document.hidden && !reducido.matches;

      const detener = () => {
        clearTimeout(temporizador);
        delete svg.dataset.mode;
        corriendo = false;
      };

      const recorrer = (repetir) => {
        if (corriendo || reducido.matches) return;
        corriendo = true;
        let indice = 0;
        const siguiente = () => {
          if (indice < modos.length) {
            svg.dataset.mode = modos[indice++];
            temporizador = setTimeout(siguiente, 1300);
            return;
          }
          delete svg.dataset.mode;
          temporizador = setTimeout(() => {
            corriendo = false;
            if (puedeCorrer()) recorrer(true);
          }, repetir ? 3500 : 900);
        };
        siguiente();
      };

      const arrancar = () => {
        if (puedeCorrer() && !corriendo) recorrer(true);
      };

      new IntersectionObserver((entradas) => {
        enPantalla = entradas[0].isIntersecting;
        if (enPantalla) arrancar();
        else detener();
      }, { threshold: 0.2 }).observe(caja);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) detener();
        else arrancar();
      });

      // Con la animación pausada, un clic sobre el dibujo la reproduce una vez.
      caja.addEventListener('click', () => {
        if (pausadaPorLaPersona && !corriendo) recorrer(false);
      });

      if (!reducido.matches) {
        const pausa = document.createElement('button');
        pausa.type = 'button';
        pausa.className = 'dibujo__pausa';
        pausa.textContent = 'Pausar animación';
        pausa.addEventListener('click', () => {
          pausadaPorLaPersona = !pausadaPorLaPersona;
          pausa.textContent = pausadaPorLaPersona ? 'Reanudar animación' : 'Pausar animación';
          if (pausadaPorLaPersona) detener();
          else arrancar();
        });
        caja.after(pausa);
      }

      setTimeout(arrancar, 1100);
    })
    .catch(() => {});
})();

// Aparición al scrollear. La lista de selectores es la misma que usa el CSS (.revela / .visto).
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  const SELECTOR = '.seccion__cabeza, .servicio, .carrusel, .taller__texto, .taller__foto, .taller__subtitulo, .paso, .contacto__accion, .datos--ficha';
  const objetivos = [...document.querySelectorAll(SELECTOR)];

  // Escalonado corto entre hermanos del mismo grupo.
  objetivos.forEach((elemento) => {
    const hermanos = [...elemento.parentElement.children].filter((otro) => otro.matches(SELECTOR));
    const posicion = hermanos.indexOf(elemento);
    if (posicion > 0) elemento.style.setProperty('--retraso', `${Math.min(posicion, 4) * 90}ms`);
  });

  document.documentElement.classList.add('revela');

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add('visto');
      observador.unobserve(entrada.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  objetivos.forEach((elemento) => observador.observe(elemento));
})();

// Carrusel de la galería. Sin JavaScript queda una tira que se desliza igual; los controles los agrega este código.
(() => {
  const raiz = document.querySelector('[data-carrusel]');
  if (!raiz) return;
  const pista = raiz.querySelector('.carrusel__pista');
  const items = [...pista.children];
  if (items.length < 2) return;

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const icono = '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-flecha"/></svg>';

  const controles = document.createElement('div');
  controles.className = 'carrusel__controles';
  controles.innerHTML = `
    <button type="button" class="carrusel__flecha carrusel__flecha--ant" aria-label="Fotos anteriores">${icono}</button>
    <div class="carrusel__centro">
      <ul class="carrusel__puntos"></ul>
      <p class="etiqueta carrusel__estado" aria-live="polite"></p>
    </div>
    <button type="button" class="carrusel__flecha carrusel__flecha--sig" aria-label="Fotos siguientes">${icono}</button>`;
  raiz.append(controles);

  const anterior = controles.querySelector('.carrusel__flecha--ant');
  const siguiente = controles.querySelector('.carrusel__flecha--sig');
  const puntos = controles.querySelector('.carrusel__puntos');
  const estado = controles.querySelector('.carrusel__estado');

  const porVista = () => Math.max(1, Math.round(pista.clientWidth / items[0].getBoundingClientRect().width));
  const posicion = (indice) => items[indice].offsetLeft - items[0].offsetLeft;
  const maximo = () => pista.scrollWidth - pista.clientWidth;
  const primero = () => {
    let mejor = 0;
    items.forEach((_, indice) => {
      if (Math.abs(posicion(indice) - pista.scrollLeft) < Math.abs(posicion(mejor) - pista.scrollLeft)) mejor = indice;
    });
    return mejor;
  };

  const irA = (indice) => {
    const destino = Math.max(0, Math.min(indice, items.length - porVista()));
    pista.scrollTo({ left: posicion(destino), behavior: reducido.matches ? 'auto' : 'smooth' });
  };

  let paginas = 0;
  const armarPuntos = () => {
    const cantidad = Math.ceil(items.length / porVista());
    if (cantidad === paginas) return;
    paginas = cantidad;
    puntos.innerHTML = '';
    for (let pagina = 0; pagina < cantidad; pagina += 1) {
      const punto = document.createElement('li');
      punto.innerHTML = `<button type="button" class="carrusel__punto" aria-label="Ir al grupo ${pagina + 1} de ${cantidad}"></button>`;
      punto.firstElementChild.addEventListener('click', () => irA(pagina * porVista()));
      puntos.append(punto);
    }
  };

  const paginaActual = () => {
    if (pista.scrollLeft >= maximo() - 2) return paginas - 1;
    return Math.min(paginas - 1, Math.floor(primero() / porVista()));
  };

  const actualizar = () => {
    armarPuntos();
    anterior.disabled = pista.scrollLeft <= 2;
    siguiente.disabled = pista.scrollLeft >= maximo() - 2;
    const actual = paginaActual();
    [...puntos.children].forEach((punto, pagina) => {
      const boton = punto.firstElementChild;
      if (pagina === actual) boton.setAttribute('aria-current', 'true');
      else boton.removeAttribute('aria-current');
    });
  };

  // El texto anunciado se actualiza cuando el deslizamiento se detiene, para no hablar de más.
  let temporizador;
  const anunciar = () => {
    const desde = primero() + 1;
    const hasta = Math.min(items.length, desde + porVista() - 1);
    estado.textContent = desde === hasta ? `Foto ${desde} de ${items.length}` : `Fotos ${desde} a ${hasta} de ${items.length}`;
  };

  let pendiente = false;
  pista.addEventListener('scroll', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(anunciar, 180);
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; actualizar(); });
  }, { passive: true });
  window.addEventListener('resize', () => { actualizar(); anunciar(); });

  anterior.addEventListener('click', () => irA(primero() - porVista()));
  siguiente.addEventListener('click', () => irA(primero() + porVista()));
  pista.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowRight') { evento.preventDefault(); irA(primero() + 1); }
    if (evento.key === 'ArrowLeft') { evento.preventDefault(); irA(primero() - 1); }
  });

  actualizar();
  anunciar();
})();
