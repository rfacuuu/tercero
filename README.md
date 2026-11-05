## v0.3.1

Feedback muestra check y confirmación Guardado sólo tras persistir y avisa si el comentario ya no existe. Se incorpora feedback positivo/negativo al contexto de próximos aportes. Contestar pide foco al editor y mantiene la superficie interactiva mientras el panel esté abierto. Validado con clics y escritura reales del sistema y envío IPC Demo, también en mini-chat.

Prompt de diseño sin elogio automático: problema observable, efecto sobre objetivo y cambio específico; sin inventar defectos. Esto cambia la instrucción, no certifica calidad de respuestas Meta sin probarlas. Un solo ajuste Estela azul más desactivar. Más intensidad con la misma cola corta. Impacto reemplazado por luz radial intensa de 1500ms, sin anillo ni borde.

QA local de captura, permisos, detener, concurrencia, pausa visual, acciones de comentarios, persistencia y contrato del prompt. Sin llamadas Meta, sin CI ni gastos. Windows nativo y calidad Meta real siguen por verificar. Instalador y updater externos intactos.

## v0.3.0

Mascota regenerada sobre negro con cuatro expresiones y sombra negra. Cursor nativo intacto con partículas cortas Canvas (130ms/38px) en overlay fijo por monitor: no se mueve una ventana a cada posición. Isla compacta azul con hover detallado (estado, Demo/Meta, comentarios y fuente), brillo al pensar y al recibir respuesta. Mascota visible despierta, salta y crece levemente al recibir un comentario/respuesta; menos movimiento evita el salto.

Arrastre con pointer capture y seguimiento de cursor del sistema mientras el botón sigue pulsado, sin activar clickthrough al salir de la mascota. Burbuja opcional desde Ajustes (240px, altura al contenido), acceso al panel completo y Responder en preguntas; hilo flotante crece hacia arriba hasta 300px con scroll. Reutiliza respuesta real y permisos existentes, Demo no consulta IA.

QA local: captura/permisos/detener, concurrencia, pausa visual, comentarios/hilos, persistencia y arrastre rápido. Sin nuevas llamadas Meta, sin CI ni gastos. Windows nativo, DPI/múltiples monitores y Meta E2E no certificados. Instalador/updater externos sin cambios.

## v0.2.9

Preview aprobado: restaurados los PNG originales con boquita y expresiones, sombra neutra detrás de mascota. Sin glow/destello sobre mascota. Efectos del cursor dibujados con Canvas 2D: estela de historial de posiciones con desvanecimiento de 360ms, glow durante trabajo real, destello de 850ms al responder solamente junto al cursor nativo. No se dibuja cursor artificial ni PNG adicional; retirado asset B y su icono de comentarios.

Iconos check/menos/abrir de 12px dentro de botones de 24px. Se conserva la pausa visual y el filtro de cambios de 0.2.8. QA local y regresiones de captura, permisos, concurrencia y comentarios sin nuevas llamadas Meta ni CI. Windows nativo/DPI/Meta E2E pendientes. Instalador/updater externos intactos.

## v0.2.8

Cursor nativo intacto: se retira el PNG B del overlay y su recorrido autónomo. Estela azul sutil solo al mover, glow durante análisis/respuesta real pendiente, efectos ocultos en pausa y opción de desactivarlos. Destello de un segundo junto a la mascota al llegar un comentario/respuesta. Mascota PNG original azul sin boca, bordes limpiados y remuestreo; estados ahora comunicados por luz/texto, sin caras distintas. Iconos Phosphor core 2.1.1 MIT incluidos localmente y checks azul pálido.

Pausa automática de análisis por diseño sin cambios: comparación de firma RGB reducida 64x40 en vez de bytes JPEG. Filtro visual heurístico: diferencia media de canal >18 en al menos 1.2% de píxeles y diferencia media global >=0.5. Referencia contra último análisis para acumular cambios. Sigue observación local para reanudar ante avance visible; no es pausa temporal ni reconocimiento semántico. Cambios muy pequeños pueden no superar el filtro; animaciones grandes dentro de la ventana sí pueden hacerlo.

QA aislado: 10 ticks sin cambio no invocan provider, un cambio visual lo invoca una vez, 10 ticks iguales posteriores no repiten y muestran pausa. Ruido y cursor mínimo ignorados. UI Electron y regresión comentarios/permisos/streams probados; ninguna llamada Meta real ni CI ni gasto. Windows nativo/DPI/Meta E2E siguen pendientes. Instalador/updater externos intactos.

## v0.2.7

Mini cursor B cerámico sin rostro, proporción fija, rotación direccional, acompañar/explorar/desactivar y menos movimiento. Explorar es movimiento geométrico decorativo, no reconocimiento de Capas ni controles. No hace clic ni modifica el diseño. Mascota original conservada como launcher separado.

Comentarios en tarjetas del panel flotante: minimizar, reabrir, resolver y contestar en hilo. Panel movible; opción de acercarlo al cursor al llegar. No hay anclaje automático a objetos, zoom o scroll. Contestar en Meta requiere permiso explícito para texto y contexto reciente, sin nueva imagen; Demo guarda respuestas locales sin IA. Hilos en registro local, tarjetas no restauradas al reiniciar. Controles azules, aportes Demo afirmativos y contexto reciente para reducir repetición en Meta.

QA local aislado con provider simulado, sin llamadas Meta ni CI. Flujos de comentarios, permisos, concurrencia, detener y regresión de streams validados. No probado Windows nativo, DPI/múltiples monitores reales, bandeja updater ni Meta extremo a extremo. Instalador y updater externos no cambiados.

## v0.2.6

Interfaz con identidad Tercero, flujo de sesion y detalles legibles. Captura: corregido el stop inmediato al iniciar/reanudar y la resolucion tardia de permisos. Estados visibles para esperar imagen, analizar, falta de permiso/clave y errores. Actualizar en bandeja abre el flujo GitHub PowerShell externo con handshake antes de cerrar. Su arranque desde bandeja y Meta completo aun no estan comprobados en Windows. No se hicieron nuevas pruebas CI.

## Actualizacion GitHub v0.2.5

Actualizador externo: ACTUALIZAR-TERCERO.bat o actualizar-github.ps1. Usa el repositorio privado ya autenticado con Git. Guarda el trabajo y sali de Tercero antes de actualizar. No necesita Drive. Verifica version, SHA256 y respaldo antes de reemplazar el paquete; intenta restaurar si la app no abre.

La interfaz fue revisada localmente. El recorrido final del actualizador NO esta comprobado en Windows. Las pruebas Windows previas se cortaron sin evidencia suficiente. No se declara validacion completa.

El instalador original se conserva sin cambios. Las instrucciones historicas siguientes describen ese instalador, no el nuevo metodo de actualizacion.

# Tercero 0.2.1

Repositorio privado de codigo y builds. No se publico para el hackathon.

## Esta version

Burbuja compacta separada de Pluma, input de contexto, configuracion separada,
menu de bandeja y actualizador con verificaciones. Voz y chat con respuestas IA
no estan implementados. La captura solo se inicia por eleccion del usuario.

## Actualizar sin reinstalar

El canal de esta build es una carpeta privada de Google Drive para escritorio.
El usuario instala Drive e inicia sesion en su cuenta personal, sin agregar
carpetas del PC a backup. El paquete Tercero-preparar-0.2.1.zip configura una vez
la MISMA instalacion existente, elige la carpeta sincronizada y aplica el ASAR.
El ZIP reutiliza el runtime Windows ya instalado, no es instalador de cero.

Las siguientes releases requieren actualizar solo tercero-ultima.json dentro de
esa carpeta privada: contiene ASAR base64, version y SHA256. El boton del tray
lee la copia sincronizada, guarda el borrador pendiente, pausa captura, verifica
version interna, rechaza downgrade, respalda, copia, verifica y pide reapertura.
No garantiza frescura de una copia local si Drive aun no sincronizo.

GitHub conserva fuentes y artefactos; publicar aqui NO sincroniza Drive por si
solo. El responsable de publicar un build debe actualizar tambien el manifest
estable de Drive y verificar su lectura antes de anunciar disponibilidad.

## Verificado y pendiente

Render de UI y pruebas de scripts con archivos reales/procesos simulados:
aplicacion, hash corrupto, version inconsistente, origen ausente y backup.
Falta confirmar instalacion y actualizacion reales en Windows y sincronizacion
Drive. No afirmar esas pruebas a partir de los tests locales.

## Datos

Preferencias y notas viven en el perfil Windows, fuera del paquete. No contiene
claves, capturas, notas personales ni credenciales. Repo y carpeta Drive privados.
Los hashes detectan corrupcion; la confianza del feed depende del acceso privado.
