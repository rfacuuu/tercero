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
