# Horus (script.module.horus) – Ajustes de reproducción

Este apunte resume el flujo de reproducción de `script.module.horus` y detalla cómo se consumen los ajustes expuestos en `resources/settings.xml`. El objetivo es facilitar el diagnóstico cuando Horus funciona en Kodi para iOS (por ejemplo en iPhone) y se necesita contrastar con otros entornos.

## Ajustes disponibles en la interfaz de Kodi

La categoría «Horus» de `resources/settings.xml` define los siguientes controles:

| ID | Tipo | Descripción | Uso en código |
| --- | --- | --- | --- |
| `ip_addr` | Texto | Dirección IP del motor AceStream. | No se usa directamente en `default.py`; el add-on consulta la disponibilidad del motor a través de `acestream.server` usando este valor almacenado internamente por la librería. |
| `ace_port` | Texto | Puerto TCP del motor AceStream. | Se maneja igual que `ip_addr` dentro de `acestream.server`. |
| `time_limit` | Slider (10–120 seg) | Tiempo máximo para que el motor y el stream completen el arranque. | `default.py` lo consulta con `get_setting("time_limit")` al esperar el arranque del motor (`Engine`) y del `Stream`. |
| `show_osd` | Booleano | Mostrar OSD con estadísticas. | Se utiliza al inicializar `MyPlayer` (`default.py`, líneas 89–117) para decidir si se muestra la clase `OSD`. |
| `remerber_last_id` | Booleano | Recordar el último ID reproducido. | `default.py`, líneas 728–732: si está activo, pre rellena el último `content_id` al pedir un identificador manual. |
| `reproductor_externo` | Booleano (solo Android) | Abrir enlaces con el reproductor externo oficial de AceStream. | `default.py`, líneas 360–369: si está activado en Android, construye un intent (`StartAndroidActivity`) con el `content_id` y no usa el reproductor interno. |
| `install_acestream` | Texto oculto | Carpeta donde se instaló AceStream en Linux/Windows. | Se rellena automáticamente tras instalar el motor y luego `acestreams()` lo usa para localizar los scripts `acestream.start/stop` o `ace_engine.exe`. |
| `stop_acestream` | Booleano | Finalizar el motor cuando termina la reproducción. | `default.py`, líneas 556–561: después de parar el stream ejecuta `kill_process()` si este flag está activo. |
| Acción «Reinstalar Acestream» | Botón | Ejecuta `RunPlugin(...?action=install_acestream)`. | `default.py`, función `install_acestream()` descarga y despliega el motor apropiado según la plataforma. |

## Flujo de reproducción

1. **Inicio desde el menú principal.** `mainmenu()` (líneas 589–621 de `default.py`) muestra acciones de reproducción, búsqueda, historial, detener motor y abrir ajustes. Al elegir «Ajustes», se invoca `xbmcaddon.Addon().openSettings()`.
2. **Resolución de la entrada.** En `run()` (líneas 694–764) se resuelven `id`, `url` o `infohash`. Si no se recibe nada, se solicita un `content_id`. El ajuste `remerber_last_id` controla si se rellena automáticamente el último valor guardado en `last_id`.
3. **Atajo Android externo.** Si la plataforma es Android y `reproductor_externo` está activo, `acestreams()` lanza un intent `org.acestream.action.start_content` con el `content_id`. En este caso el add-on no gestiona la reproducción y delega en la app AceStream.
4. **Arranque del motor AceStream.** Para otras plataformas, `acestreams()` localiza el ejecutable o script de arranque usando `install_acestream`. Si la opción `stop_acestream` está habilitada (o si el identificador de Linux es `ubuntu`), al finalizar se ejecuta `kill_process()` que usa `cmd_stop_acestream` (guardado al elegir el script `acestream.stop`) o `taskkill` en Windows.
5. **Control de tiempo de espera.** El valor `time_limit` se consulta en tres bucles de espera: comprobación del servidor, lanzamiento del motor y arranque del stream. Si se supera el límite se notifica `translate(30019)` y se aborta la operación.
6. **OSD opcional.** Mientras `MyPlayer` reproduce el stream, la clase `OSD` puede mostrar estadísticas (estado, velocidades, peers, volumen de datos) si `show_osd` está activo. El HUD se actualiza mediante `stream.stats`.

## Diferencias relevantes para iOS / tvOS

* En `get_system_platform()` (`lib/utils.py`, líneas 232–272) se reporta `android` cuando Kodi se ejecuta sobre tvOS. Eso explica por qué Horus en un iPhone/tvOS puede seguir la rama Android y usar la reproducción externa.
* En entornos no Android (Windows/Linux), Horus necesita un motor AceStream local accesible en `ip_addr:ace_port`. Si la app de iOS funciona “sin problema” es porque Kodi delega la reproducción al motor oficial mediante intent, mientras que en otros sistemas hay que configurar los scripts/startup manualmente.

## Archivos clave

* `script.module.horus/resources/settings.xml` – definición de ajustes.
* `script.module.horus/default.py` – flujo principal de reproducción y uso de los ajustes.
* `script.module.horus/lib/utils.py` – helpers para leer/escribir ajustes y detectar plataforma.
* `index.html` y `packages/web-client/html/app_index.html` – interfaz que replica los ajustes básicos de Horus para la app iOS.

Referencias directas:

* `default.py`: líneas 360–520, 556–764 (gestión de reproducción y ajustes).【F:script.module.horus/default.py†L360-L520】【F:script.module.horus/default.py†L556-L764】
* `resources/settings.xml`: líneas 1–19 (definición de los ajustes).【F:script.module.horus/resources/settings.xml†L1-L19】
* `lib/utils.py`: líneas 232–312 (gestión de ajustes y detección de plataforma).【F:script.module.horus/lib/utils.py†L232-L312】
* `index.html`: líneas 1–209 (pantalla de reproducción con ajustes equivalentes a Horus).【F:index.html†L1-L209】
* `packages/web-client/html/app_index.html`: líneas 1–209 (versión incrustada en la app iOS).【F:packages/web-client/html/app_index.html†L1-L209】
