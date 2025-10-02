CasaBella — Bot de Sorteos (Web)

Este proyecto es una página web de sorteos pensada para que cualquier persona pueda participar de forma simple y transparente, y para que el administrador pueda gestionar todo desde el mismo sitio.

La app es 100% front-end (una sola página con HTML, CSS y JavaScript) y la parte "Back-end" la realicé con Firebase para guardar los datos de los usuarios y las reglas de la página.

Para el usuario armé el sistema de la siguiente manera:

1) Un menú fijo arriba con el botón de inicio de sesión (icono 👤).

2) Un hero con el logo y la palabra SORTEO bien visibles.

3) Una sección “¿Cómo participar?” explicada en texto, sin tarjetas, sobre el fondo.

4) Un formulario para inscribirse:
    Nombre y teléfono.

5) Un único número del 000 al 999 (el campo se completa automáticamente a 3 dígitos: 1 → 001, 15 → 015, etc.).

6) Una sección de Premios (hasta 5), cada uno con imagen, título y breve descripción.

7) Un listado de Últimos ganadores con nombre, número y fecha.

8) Un botón flotante de WhatsApp y, en mobile, una barra de redes fija al pie.

La página es responsiva (se adapta a celular y PC), el menú se vuelve hamburguesa en pantallas chicas y el diseño mantiene el estilo y colores de la marca de la empresa.

Para participar se hace de la siguiente manera:

Toca el icono de la persona en el menú para iniciar sesión con Google (lo hice con un modal).

Completa nombre y teléfono.

Elige un número del 000 al 999 en el formulario y envía.

La página valida dos cosas importantes:

No puede elegir un número que ya esté usado por otra persona en ese sorteo. Si el número está ocupado, aparece un aviso y puede intentar con otro.

Una participación por usuario por sorteo. Si ya participó, se le avisa que debe esperar al próximo o al reinicio.

Al enviar, el usuario queda anotado con su número y aparece un mensaje de confirmación.

El administrador va a tener las siguientes funciones:

El panel de admin solo aparece si el usuario tiene rol de administrador (se configura en la base de datos). Desde ahí puede:

Realizar el sorteo

Elegir la cantidad de ganadores (1, 2 o 3).

Activar “evitar dos premios al mismo usuario” (para que un mismo participante no gane dos veces en la misma ronda).

Al sortear, se eligen ganadores al azar del listado de números participantes y guarda los resultados.

Resetear el sorteo

Borra los números elegidos y libera a todos los usuarios para que puedan participar de nuevo en la próxima ronda.

Doble chance (opcional)

Desde “Gestionar participantes” puede asignar a una persona un número extra o quitárselo.

También verifica que ese número extra no esté ocupado y que no sea el mismo que el principal.

Administrar los premios

Cargar hasta 5 premios con imagen, título y descripción.

Esos premios se muestran debajo del formulario para que la gente los vea antes de participar.

También puede eliminar un premio.

Públicamente muestra lo siguiente:

Premios vigentes (imagen, título y descripción).

Últimos ganadores: se listan con su nombre, el número con el que ganaron y la fecha.

El resto (participantes, números ocupados, etc.) se gestiona internamente.

Detalles de diseño y usabilidad

Identidad visual: colores de la marca (rojos y naranjas) con un estilo sobrio y profesional.

Formulario destacado: se diseñó una tarjeta con borde “neón” animado que llama la atención, pero mantiene una estética limpia.

Texto “¿Cómo participar?”: se muestra sobre el fondo con una barra de color a la izquierda para guiar la lectura.

Mobile-first:

El logo y “SORTEO” se acomodan para no cortarse en iPhone (respeta los “safe areas” del notch).

Menú hamburguesa claro y accesible.

Barra de redes fijada abajo en móviles para simular una app mobile.

Feedback claro: se usan alertas visuales (SweetAlert) para confirmar acciones y advertir sobre errores (número ocupado, falta de datos, etc.).

¿Qué pasa “detrás” sin tecnicismos?

Cuando alguien inicia sesión con Google, el sitio crea/actualiza su perfil (nombre y mail).

Al participar, se guarda su número elegido y sus datos básicos para el sorteo actual.

El admin puede sortear, resetear y cargar premios desde la misma página.

Cada vez que hay ganadores, se guardan como historial y también se muestran en la sección pública de “Últimos ganadores”.

Casos típicos que resolvimos

Dos personas eligen el mismo número → el segundo recibe un aviso y elige otro.

Alguien quiere participar dos veces → el sistema lo detecta y le muestra que ya está participando.

El admin quiere dar “doble chance” a un cliente fiel → le asigna un número extra libre desde el panel.

Nuevo sorteo → el admin presiona Resetear y todos pueden volver a participar con números renovados.

Cómo lo mostré/probé

Inicié sesión con una cuenta normal y participé con un número libre.

Intenté repetir número desde otra cuenta: el sistema lo bloqueó correctamente.

Cambié a una cuenta con rol admin:

Cargué premios y los vi reflejados en la sección pública.

Sorteé (2 ganadores) y se mostraron en el listado con fecha.

Asigné una doble chance a un participante y luego la quité.

Probé Resetear y verifiqué que todos podían volver a participar.

Qué entrego

index.html: estructura y componentes (nav, hero, pasos, formulario, premios, ganadores, panel admin, modales).

styles.css: estilos, animaciones y versión responsive (incluye ajustes para iPhone).

main.js: interacción de la página (inicio de sesión, validaciones, guardado de participación, sorteo, gestión de premios y participantes, alertas).

Resumen:

La página resuelve un sorteo real el cual es completamente trasparente

La gente se anota con un número único y una sola vez por sorteo.

El admin controla los premios, puede dar doble chance, sortear y resetear.

Todo lo importante se guarda para poder mostrar ganadores y mantener transparencia.

El diseño es simple, consistente y responsive, orientado a la confianza del usuario.

Este proyecto es una página que realicé para un cliente y creo que tiene todos los fundamentos (y más) para poder aprobar el curso, obviamente estoy en continuo aprendizaje ya que vengo el curso de Front-End y estoy en el curso de FullStack para reforzar conocimientos y aprender nuevos métodos y mantenerme actualizado, espero poder aprender mucho más de ustedes en este curso, si pueden darme una critica constructiva estaría agradecido realmente ya que claramente aún tengo mucho para mejorar y leo y presto atención a todas las correcciones y consejos que vienen de ustedes y de los que me acompañan en el curso.