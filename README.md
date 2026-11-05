# Tercero

Un compañero de diseño que vive en el escritorio. Observa la ventana que elegís, propone una mirada crítica y conversa sobre las revisiones. Vos decidís qué cambiar: Tercero no edita tu archivo.

Versión disponible: **0.3.7**. Prototipo Electron para Windows x64.

## Qué hace hoy

- Selección explícita de ventana, objetivo y reglas del diseño; pausa, reanudación y fin de sesión.
- Análisis de cambios visuales con Meta Muse Spark 1.3. El primer frame es referencia; no pide análisis por cada frame ni repite automáticamente una imagen sin cambios.
- Comentarios, respuestas y consultas de texto con contexto reciente. Consultar no toma una imagen nueva y no demuestra visión por sí solo.
- Historial en el panel, temas claro/oscuro, mascota flotante o isla superior y cinco niveles de explicación. El nivel cambia vocabulario y profundidad, no rigor.
- La imagen ya analizada aparece junto a su revisión. Se conserva en memoria durante la sesión, con un máximo de 12 imágenes, y no se escribe en el registro JSONL. Se borra al iniciar otra sesión, terminarla o cerrar la app.
- SAM 3.1 localiza el elemento que escribís y muestra cajas sobre esa imagen. Cada consulta requiere confirmación de envío y costo. No juzga el diseño, no modifica el archivo y no ejecuta consultas SAM automáticas.
- Lectura opcional de mensajes mediante voces locales instaladas en el equipo. No es voz de Meta y no usa micrófono. La autolectura está apagada por defecto.
- Interruptores en Ajustes para ocultar y desactivar voz, miniaturas y SAM. Apagar miniaturas no detiene el análisis visual autorizado; para eso usá Pausar o Terminar sesión.

## Probar desde el código

Requisitos: Git, Node.js y npm. La dependencia de Electron parte de 45.2.2; npm descarga las dependencias de desarrollo.

```sh
git clone https://github.com/rfacuuu/tercero.git
cd tercero
npm install
npm start
```

La app inicia sin captura y en Demo local si no elegiste otro modo. Demo no hace llamadas a Meta y sus mensajes están identificados como demostración.

Para usar Meta: abrí Ajustes, guardá tu propia clave de Meta Model API y autorizá el envío de imágenes. Las conversaciones de texto tienen un permiso separado. La clave se cifra localmente con Electron safeStorage; nunca debe añadirse al repositorio ni mostrarse en la grabación.

## Grabar una demo con OBS

En Ajustes > Captura e IA, activá "Permitir que se grabe Tercero en esta ejecución". Se aplica al momento, sin Guardar ajustes. Permite que otras capturas vean la UI, mascota y efectos; no cambia los permisos de Meta. Apagalo al terminar: vuelve la protección de esas ventanas. Al cerrar y volver a abrir Tercero empieza apagado. Cerrá claves y ventanas privadas antes de grabar y hacé una prueba breve en OBS. Se verificaron controles y llamadas de protección locales; la grabación final debe comprobarse en Windows.

## Actualizar una instalación existente

En una instalación ya preparada con el canal GitHub, usá **Actualizar** en la bandeja. El actualizador fija el commit recibido, comprueba versión y SHA256, guarda un respaldo y trata de restaurarlo si la nueva app no abre. La captura no se reanuda automáticamente.

El repositorio incluye `app.asar.b64`, el código fuente y `tercero-release-0.3.7.json`. Esos archivos no son por sí solos un instalador completo de Electron.

Los scripts y ZIP de la versión 0.2.1 que mencionan Drive, y los lanzadores externos con una ruta Windows prefijada, son históricos o específicos de la instalación original. **No son el procedimiento actual ni un instalador actualizado desde cero.** No los uses para preparar una demo nueva; para una instalación nueva usá el código fuente con los pasos anteriores.

## Datos, permisos y costos

El análisis de Meta envía la captura de la ventana autorizada y contexto del diseño. Las respuestas de chat envían texto y contexto reciente, sin tomar una captura nueva. El contexto es limitado; no recuerda todo el historial.

El registro local de sesión contiene comentarios, notas y decisiones. No se publica automáticamente y debe revisarse antes de compartirlo. Las miniaturas y cajas SAM son temporales. Las imágenes que autorizás enviar se procesan en el servicio de Meta, no exclusivamente en tu equipo.

Las llamadas a Meta pueden consumir créditos o generar costos. SAM imagen costaba USD 0,0025 por consulta en la tarifa revisada el 4 de noviembre de 2026. Verificá siempre la tarifa vigente. Una solicitud que agota el tiempo de espera no prueba que el proveedor no la haya procesado o cobrado; la app no la reintenta automáticamente.

## Estado de verificación y límites

Se comprobó el flujo de captura de una ventana ficticia hasta la imagen de revisión usando análisis Demo, los permisos, pausa/reanudación, guardado, manejo de errores y descarte de resultados obsoletos. También se hizo una prueba real de SAM sobre una imagen ficticia: localizó su botón y se verificó la caja en pantalla. Esa prueba no garantiza precisión en cualquier interfaz, texto o elemento pequeño.

La reproducción de voces locales y la ausencia del recorte fugaz al cerrar el panel todavía necesitan confirmación en el Windows del usuario. La calidad de los comentarios de Meta varía; el modelo puede equivocarse. El silencio tras analizar también puede ser un resultado válido.

No se incluyen generación de imágenes, dictado, seguimiento de video, edición automática del diseño ni publicación automática de portfolios. El registro puede ayudar a preparar documentación; no reemplaza la revisión de un caso o reporte.

## Estructura

- `src/main.js`: ventanas, permisos y coordinación del análisis.
- `src/ai.js`: integración de visión y conversación.
- `src/sam.js`: solicitud de imagen a SAM y lectura de cajas.
- `src/renderer/`: interfaz, captura y recursos locales.
- `src/session-log.js`: registro local de texto y eventos.
- `CHANGELOG.md`: notas históricas de versiones.

## Documentación de los servicios

- https://dev.meta.ai/docs/sam/segmenting
- https://dev.meta.ai/docs/sam/reading-segmentation
- https://dev.meta.ai/docs/pricing-rate-limits

El código declara licencia MIT en package.json. Los recursos de terceros conservan sus licencias: los iconos Phosphor incluyen su licencia; las fuentes Inter requieren conservar su licencia correspondiente.
