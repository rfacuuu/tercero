const { contextBridge, ipcRenderer } = require('electron');
let stream = null, video = null, canvas = null;
async function startStream(sourceId) {
  stopStream();
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId, maxWidth: 1280, maxHeight: 800 } }
  });
  video = document.createElement('video');
  video.srcObject = stream; await video.play();
  canvas = document.createElement('canvas');
}
function stopStream() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
function grabFrame() {
  if (!video || !video.videoWidth) return null;
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.6);
}
contextBridge.exposeInMainWorld('terceroCapture', { grabFrame });
ipcRenderer.on('capture:start-stream', (_e, id) => { startStream(id).catch(() => {}); });
ipcRenderer.on('capture:stop-stream', () => stopStream());
