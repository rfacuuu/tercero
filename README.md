# tercero (repo privado de actualizaciones)

Companero de diseno en vivo: isla flotante de Electron que mira la ventana
que VOS elegis, sugiere y pregunta mientras diseas, y redacta el borrador
del caso para tu portfolio.

## Como actualizar (Windows)

1. Primera vez: `git clone https://github.com/rfacuuu/tercero.git` y entra a la carpeta.
2. Doble clic en `actualizar.bat`.
   - La primera vez te pide la ruta donde esta `tercero.exe` (la guarda en
     `instalacion.txt` para la proxima).
   - Baja la ultima version, hace respaldo, verifica la copia y reabre la app.
3. Si algo falla despues de actualizar: doble clic en `restaurar.bat`.

El update pesa ~40 KB (solo `app.asar`), no los 151 MB del paquete completo.

## Que NO toca una actualizacion

- Tus preferencias, reglas aprendidas y clave Meta: viven cifradas en tu
  usuario de Windows (%APPDATA%), fuera del alcance del update.
- Ningun otro programa: el .bat solo cierra `tercero.exe` antes de reemplazar.

## Privacidad

- Captura solo la fuente que elegis, solo cuando esta activa. Pausa inmediata.
- Sin consentimiento explicito en Preferencias, ninguna captura sale de tu PC.
- Con creditos gratuitos, Meta puede usar el contenido enviado para mejorar el
  producto (aviso literal dentro de la app).
- Nada se graba ni se publica por defecto.

`tercero-src.zip.b64` tiene el codigo fuente (base64; decodificar con `certutil -decode tercero-src.zip.b64 tercero-src.zip`) completo de esta version.
