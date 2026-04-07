// @ts-check
/**
 * Mock WebSocket server — simulates the DatIA voice backend protocol.
 *
 * Protocol messages (server → client):
 *   { type: "session_ready" }
 *   { type: "audio_chunk",  data: "<base64 PCM 24kHz>" }
 *   { type: "transcript",   role: "user"|"assistant", text: "..." }
 *   { type: "session_reconnected" }
 *   { type: "error",        message: "..." }
 *
 * Protocol messages (client → server):
 *   { type: "start_audio" }
 *   { type: "stop_audio" }
 *   { type: "audio_chunk",  data: "<base64 PCM 16kHz>" }
 *   { type: "text_message", text: "..." }
 *   { type: "end_session" }
 */

const { WebSocketServer } = require("ws");

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

// ── Mock responses ────────────────────────────────────────────────
const MOCK_RESPONSES = [
  "Claro, estoy aquí para ayudarte con gobierno de datos. ¿Qué necesitas?",
  "Esa es una excelente pregunta sobre gestión de datos. Te explico paso a paso.",
  "Basado en las mejores prácticas de DAMA, te recomiendo comenzar con una evaluación de madurez.",
  "El marco de gobierno de datos incluye políticas, procesos, roles y tecnología. ¿Por dónde empezamos?",
  "Puedo ayudarte a diseñar un assessment completo con dimensiones, preguntas y niveles de madurez.",
];

let responseIndex = 0;
function nextMockResponse() {
  const text = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length];
  responseIndex++;
  return text;
}

// Generate a tiny silent PCM-16 audio buffer as base64 (so client audio pipeline works)
function makeSilentAudioChunk(durationMs = 100, sampleRate = 24000) {
  const samples = Math.floor((sampleRate * durationMs) / 1000);
  const buf = Buffer.alloc(samples * 2); // 16-bit = 2 bytes/sample, all zeros = silence
  return buf.toString("base64");
}

// ── Per-connection state ──────────────────────────────────────────
function handleConnection(ws) {
  console.log("[mock-ws] Client connected");

  let audioAccumulating = false;
  let responseTimer = null;

  function send(obj) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  function sendMockResponse(userText) {
    const responseText = nextMockResponse();
    console.log(`[mock-ws] → transcript user: "${userText}"`);
    console.log(`[mock-ws] → transcript assistant: "${responseText}"`);

    // 1. Echo user transcript
    send({ type: "transcript", role: "user", text: userText });

    // 2. Simulate assistant "thinking" delay then stream audio chunks + transcript
    setTimeout(() => {
      // Send a few silent audio chunks to trigger the audio pipeline
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          send({ type: "audio_chunk", data: makeSilentAudioChunk(80) });
        }, i * 90);
      }

      // Send assistant transcript after audio starts
      setTimeout(() => {
        send({ type: "transcript", role: "assistant", text: responseText });
      }, 300);
    }, 600);
  }

  // Send session_ready after a short delay (simulates server handshake)
  setTimeout(() => {
    console.log("[mock-ws] → session_ready");
    send({ type: "session_ready" });
  }, 400);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      console.warn("[mock-ws] Non-JSON message received");
      return;
    }

    switch (msg.type) {
      case "start_audio":
        console.log("[mock-ws] ← start_audio");
        audioAccumulating = true;
        break;

      case "audio_chunk":
        // Accumulate silently — real server would process PCM here
        break;

      case "stop_audio":
        console.log("[mock-ws] ← stop_audio");
        if (audioAccumulating) {
          audioAccumulating = false;
          // Simulate STT: generate a mock user utterance
          clearTimeout(responseTimer);
          responseTimer = setTimeout(() => {
            sendMockResponse("¿Puedes ayudarme con gobierno de datos?");
          }, 300);
        }
        break;

      case "text_message":
        console.log(`[mock-ws] ← text_message: "${msg.text}"`);
        sendMockResponse(msg.text || "(sin texto)");
        break;

      case "end_session":
        console.log("[mock-ws] ← end_session");
        ws.close();
        break;

      default:
        console.log(`[mock-ws] ← unknown: ${msg.type}`);
    }
  });

  ws.on("close", () => {
    console.log("[mock-ws] Client disconnected");
    clearTimeout(responseTimer);
  });

  ws.on("error", (err) => {
    console.error("[mock-ws] Error:", err.message);
  });
}

wss.on("connection", handleConnection);

wss.on("listening", () => {
  console.log(`\n✓ Mock WebSocket server running at ws://localhost:${PORT}/ws`);
  console.log("  Protocol: DatIA voice mock — responds to start_audio, stop_audio, text_message\n");
});

wss.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`✗ Port ${PORT} already in use. Stop the existing server and retry.`);
  } else {
    console.error("✗ Server error:", err.message);
  }
  process.exit(1);
});
