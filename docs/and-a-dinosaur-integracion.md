# Guía de integración de utilidades de "And a Dinosaur" en Yavale

## 1. Contexto general

Este documento describe una posible ruta de trabajo para incorporar, dentro del ecosistema del proyecto **MontanaOpenAiTV / Yavale**, varias funcionalidades inspiradas en las herramientas publicadas en la página *And a Dinosaur*. El objetivo es mejorar la experiencia de reproducción, depuración y distribución de contenidos en televisores y dispositivos Apple TV manteniendo un stack lo más cercano posible a la base existente.

La guía está pensada como apoyo para el desarrollador que mantiene el repositorio `yavale` en su entorno local.

## 2. Preparación del entorno

1. **Clonar o actualizar el repositorio**
   - Verifica que cuentas con `git` y las dependencias necesarias (`node`, `npm` y/o `python`, según el flujo de trabajo actual del proyecto).
   - Ejecuta en tu máquina:
     ```bash
     git clone https://github.com/<tu-usuario>/yavale.git
     cd yavale
     git remote add upstream git@github.com:MontanaOpenAiTV/yavale.git  # si no existe
     git fetch upstream
     git checkout main
     git pull upstream main
     ```
   - Para entornos ya clonados, basta con entrar en la carpeta y hacer `git pull`.

2. **Instalar dependencias del proyecto**
   - Revisa `README.md` y los scripts de `setup.sh` para confirmar los requisitos.
   - Instala las dependencias base:
     ```bash
     npm install         # si el frontend se construye con Node
     pip install -r requirements.txt  # si existe backend en Python
     ```
   - Valida el funcionamiento ejecutando los comandos de arranque habituales (por ejemplo `npm run dev` o el script que utilices para montar el servidor).

3. **Crear un entorno de pruebas**
   - Configura un Apple TV o dispositivo AirPlay en la misma red para validar la transmisión.
   - Ten a mano un navegador compatible (Safari, Chrome) con soporte para extensiones de WebKit.
   - Considera utilizar un túnel SSH hacia una red de pruebas si necesitas exponer el entorno local.

## 3. Integración por funcionalidades

### 3.1 Vinegar (sustituir el reproductor de YouTube)

**Objetivo**: incorporar soporte para reproducir vídeos de YouTube mediante `<video>` nativo dentro de Yavale.

1. **Analizar la capa de reproducción actual**
   - Ubica el componente o módulo encargado de mostrar el reproductor (por ejemplo dentro de `app/` o `html/`).
   - Documenta qué librería utiliza actualmente (YouTube IFrame API, reproductores personalizados, etc.).

2. **Implementar un "modo Vinegar"**
   - Crea un wrapper que extraiga el enlace de streaming MP4/HLS de cada vídeo.
   - Utiliza la API de YouTube (o servicios de extracción permitidos) para obtener URL directas.
   - Renderiza un `<video>` nativo con los atributos `controls`, `playsinline`, `autoplay` y soporte para PiP.

3. **Privacidad y control**
   - Añade opciones en la configuración (`manifest.json` o panel de ajustes) para activar/desactivar este modo.
   - Bloquea la carga de scripts de seguimiento innecesarios (por ejemplo, filtrando `youtube.com/iframe_api`).

4. **Pruebas**
   - Verifica la reproducción, la entrada en PiP y el audio en segundo plano.
   - Comprueba que no se muestran anuncios ni se abren ventanas emergentes.

### 3.2 Baking Soda (soporte para otros reproductores)

**Objetivo**: generalizar la sustitución por `<video>` en cualquier sitio embebido.

1. **Detección del proveedor**
   - Implementa un módulo que identifique el origen del reproductor (por ejemplo, Twitch, Vimeo, Dailymotion).
   - Define adaptadores que traduzcan cada origen a una URL de streaming compatible.

2. **Inyección controlada**
   - Si el reproductor se carga dentro de un `webview`, añade lógica para reemplazar dinámicamente el elemento por `<video>`.
   - Para contenido remoto, utiliza `Content-Security-Policy` para evitar bloqueos.

3. **Fallback**
   - Mantén un modo de compatibilidad que use el reproductor original si no se logra obtener la URL nativa.

4. **Monitorización**
   - Registra métricas básicas (tiempo de carga, errores de reproducción) para evaluar la eficacia de la sustitución.

### 3.3 Web Inspector (inspección del DOM en iOS/iPadOS)

**Objetivo**: facilitar la depuración desde dispositivos móviles de Apple.

1. **Habilitar el inspector remoto**
   - Activa las banderas necesarias en el proyecto para permitir la depuración remota (por ejemplo, `WKWebView` con `allowsLinkPreview = false` y `isInspectable = true`).
   - Documenta cómo emparejar el dispositivo iOS/iPadOS con un Mac para usar Web Inspector.

2. **Guía de uso**
   - Incluye instrucciones paso a paso para inspeccionar el DOM, revisar estilos y analizar peticiones.
   - Recomienda flujos de trabajo para resolver problemas de reproducción o layout.

### 3.4 Teleplayer (listas y AirPlay)

**Objetivo**: ofrecer una experiencia de listas de reproducción con envío a Apple TV.

1. **Diseño de la funcionalidad**
   - Añade en la UI de Yavale un módulo de "cola" o "playlist" inspirado en Teleplayer.
   - Permite añadir vídeos desde ACE Streams, URLs directas o resultados de búsqueda.

2. **Integración con AirPlay**
   - Si usas un cliente macOS, reutiliza `AVQueuePlayer` y la API de AirPlay.
   - Desde Yavale, expón un botón `AirPlay` que invoque la API de `navigator.mediaSession` o un puente nativo.

3. **Gestión de energía**
   - Implementa en el cliente macOS un mecanismo que evite que el equipo entre en reposo mientras haya reproducción.

4. **Sincronización de estados**
   - Guarda el progreso de cada vídeo para retomar la reproducción al volver al Apple TV.

### 3.5 Makeover (personalización con CSS/JS)

**Objetivo**: permitir personalizar la interfaz de Yavale mediante inyecciones controladas.

1. **Motor de temas**
   - Crea una carpeta `addon/themes/` donde almacenar CSS/JS personalizados.
   - Define una convención (por ejemplo, `manifest.json` por tema) que indique qué archivos se cargan.

2. **Panel de administración**
   - Añade una interfaz que permita activar/desactivar temas y editar reglas CSS en caliente.
   - Implementa un preview con `postMessage` o WebSockets para reflejar cambios al vuelo.

3. **Seguridad**
   - Restringe las APIs disponibles para el JavaScript inyectado (por ejemplo, sandboxing con `iframe` o `Trusted Types`).

### 3.6 Crappy VPN (túneles SSH simplificados)

**Objetivo**: facilitar el acceso remoto a recursos sin requerir un VPN completo.

1. **Scripts de automatización**
   - Crea scripts en `vpn/` que establezcan túneles SSH con los parámetros adecuados.
   - Permite configurar host, puerto y clave privada mediante variables de entorno.

2. **Integración con Yavale**
   - Expón una interfaz CLI o web que muestre el estado del túnel y permita reconectarlo.
   - Documenta casos de uso típicos: acceso al servidor ACE Stream remoto, reenvío de puertos a Apple TV en otra red, etc.

3. **Gestión de credenciales**
   - Usa el llavero del sistema o un gestor de secretos para almacenar claves.
   - Añade ejemplos de configuración en `montana-server.conf` y `montana-client.conf`.

## 4. Roadmap sugerido

1. Prioriza la sustitución por `<video>` en YouTube (Vinegar) para obtener beneficios inmediatos en privacidad y PiP.
2. Extiende la lógica a otros servicios (Baking Soda) reutilizando componentes.
3. Integra Teleplayer para mejorar la reproducción en Apple TV y mantener al Mac despierto.
4. Habilita herramientas de depuración (Web Inspector) y personalización (Makeover) para iterar rápidamente.
5. Automatiza el acceso remoto con Crappy VPN para el equipo distribuidor.

Para cada etapa, prepara pruebas automáticas o manuales que aseguren la compatibilidad con los flujos existentes.

## 5. Buenas prácticas generales

- Mantén la documentación actualizada (incluyendo este archivo) con cada funcionalidad nueva.
- Agrega pruebas unitarias/e2e cuando sea posible para validar la reproducción.
- Usa ramas específicas (`feature/vinegar`, `feature/teleplayer`, etc.) y revisiones de código frecuentes.
- Documenta en `README.md` cómo activar o desactivar cada módulo para que otros colaboradores puedan replicar el entorno.

## 6. Recursos adicionales

- [And a Dinosaur – Extensiones](https://andadinosaur.com/) (consulta las páginas individuales para detalles técnicos).
- Documentación de YouTube Data API y IFrame API.
- Guías de Apple para `AVKit`, AirPlay y Web Inspector.
- Manuales de OpenSSH para la creación de túneles y reenvío de puertos.

---

Este plan es una base; ajusta las prioridades y la profundidad de implementación según las necesidades del proyecto y la disponibilidad de recursos.
