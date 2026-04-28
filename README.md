# Nova App

Interfaz web de chat para DatIA con entrada por voz y texto. La aplicacion corre sobre Next.js 16 + React 19, mantiene conversaciones en el navegador y se conecta a un backend de voz por WebSocket para enviar audio, recibir transcripciones y reproducir respuestas habladas.

## Que hace el proyecto

- Inicia una conversacion desde una vista principal con acciones rapidas y campo de texto.
- Permite grabar voz desde el navegador usando el microfono.
- Envia el audio al backend por WebSocket cuando termina la intervencion del usuario.
- Reproduce audio PCM recibido del servidor y muestra los mensajes transcritos en pantalla.
- Guarda sesiones recientes en `localStorage` para reabrir conversaciones desde la UI.
- Incluye un servidor mock de WebSocket para desarrollo local.

## Stack tecnico

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- WebSocket (`ws`) para el mock local
- Web Audio API, MediaDevices API y AudioWorklet para captura y reproduccion de audio

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Un navegador moderno con soporte para:
	- `navigator.mediaDevices.getUserMedia`
	- `AudioContext`
	- `AudioWorklet`
- Permisos de microfono habilitados

## Inicializacion del proyecto

1. Clona el repositorio y entra al directorio del proyecto.
2. Instala dependencias:

```bash
npm install
```

3. Opcional: crea un archivo `.env.local` si quieres definir explicitamente la URL del backend de voz.

```env
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:8080/ws
```

Si no defines `NEXT_PUBLIC_VOICE_WS_URL`, la app usa por defecto el endpoint remoto configurado en el frontend.

## Ejecucion en desarrollo

### Opcion 1: usar el backend de voz remoto

```bash
npm run dev
```

Abre `http://localhost:3000` en el navegador.

### Opcion 2: usar el mock local de WebSocket

1. Crea `.env.local` con esta variable:

```env
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:8080/ws
```

2. En una terminal, inicia el mock:

```bash
npm run dev:ws
```

3. En otra terminal, inicia la app:

```bash
npm run dev
```

4. Abre `http://localhost:3000` y concede permisos de microfono.

## Scripts disponibles

```bash
npm run dev      # levanta Next.js en modo desarrollo
npm run dev:ws   # levanta el mock WebSocket local en el puerto 8080
npm run build    # genera el build de produccion
npm run start    # sirve el build generado
npm run lint     # ejecuta ESLint
```

## Flujo funcional del chat de voz

1. La aplicacion monta `DatiaChat` como pagina principal.
2. Al cargar, el cliente abre una conexion WebSocket con el backend de voz.
3. Cuando el servidor responde con `session_ready`, la UI queda lista para texto o voz.
4. Al activar el microfono, el navegador captura audio a 16 kHz.
5. El audio se bufferiza localmente y se envia al backend al terminar la grabacion.
6. El servidor responde con eventos de transcript y chunks de audio PCM a 24 kHz.
7. La interfaz muestra burbujas de usuario/asistente y reproduce la respuesta hablada.
8. Cada conversacion se guarda automaticamente en `localStorage`.

## Estructura principal

```text
app/
	page.tsx                       # entrypoint de la pagina
	components/datia/
		DatiaChat.tsx                # contenedor principal del producto
		HomeView.tsx                 # pantalla inicial y accesos rapidos
		ChatView.tsx                 # vista de conversacion
		ChatInput.tsx                # input de texto y controles de voz
		useVoiceChat.ts              # conexion WS, microfono y audio
		useSessions.ts               # persistencia de conversaciones
server/
	ws-mock.js                     # backend mock para desarrollo local
```

## Persistencia y datos locales

- Las conversaciones se almacenan en `localStorage` bajo la clave `datia_sessions`.
- Se conservan hasta 20 sesiones recientes.
- El titulo de cada sesion se genera a partir del primer mensaje del usuario.

## Consideraciones de desarrollo

- El modo voz depende de APIs del navegador; no funciona durante SSR.
- Si el microfono falla, la UI pasa a estado de error desde el hook `useVoiceChat`.
- El mock local no hace reconocimiento real de voz: simula transcripcion y audio para probar la interfaz.
- Si cambias el backend de voz, revisa el protocolo esperado en `server/ws-mock.js`.

## Build de produccion

```bash
npm run build
npm run start
```

Para produccion, define `NEXT_PUBLIC_VOICE_WS_URL` con la URL del backend que exponga el protocolo de voz esperado por la aplicacion.
