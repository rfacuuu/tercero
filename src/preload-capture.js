const { contextBridge, ipcRenderer } = require('electron');
let stream = null, video = null, canvas = null, generation = 0;
async function startStream(sourceId) {
  stopStream();const token=generation;
  const next = await navigator.mediaDevices.getUserMedia({audio:false,video:{mandatory:{chromeMediaSource:'desktop',chromeMediaSourceId:sourceId,maxWidth:1280,maxHeight:800}}});
  if(token!==generation){next.getTracks().forEach(t=>t.stop());return;}
  stream=next;video=document.createElement('video');video.srcObject=stream;await video.play();
  if(token!==generation)return;
  canvas=document.createElement('canvas');
}
function stopStream(){generation++;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}if(video){video.pause();video.srcObject=null;}video=null;canvas=null;}
function grabFrame(){if(!stream||!video||!canvas||!video.videoWidth)return null;canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);const sigCanvas=document.createElement('canvas');sigCanvas.width=64;sigCanvas.height=40;const ctx=sigCanvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,64,40);const data=ctx.getImageData(0,0,64,40).data,signature=[];for(let i=0;i<data.length;i+=4)signature.push(data[i],data[i+1],data[i+2]);return {jpeg:canvas.toDataURL('image/jpeg',0.6),signature};}
contextBridge.exposeInMainWorld('terceroCapture', { grabFrame });
ipcRenderer.on('capture:start-stream', (_e, id) => { startStream(id).catch(()=>ipcRenderer.send('capture:stream-error','No se pudo acceder a la ventana elegida. Volve a seleccionarla.'));  });
ipcRenderer.on('capture:stop-stream', () => stopStream());
