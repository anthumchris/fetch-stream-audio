// util function for debugging pops/glitches in audio playback

export default async function playUrl(url, subsequentPlaybackDelay, numPlays, latencyHint) {
  const arrayBuffer = await fetch(url).then(r => r.arrayBuffer());
  await playArrayBuffer(arrayBuffer, latencyHint);

  if (--numPlays) {
    setTimeout(_ => {
      playUrl(url, subsequentPlaybackDelay, numPlays, latencyHint);
    }, subsequentPlaybackDelay);
  }
}

async function playArrayBuffer(arrayBuffer, latencyHint) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint });
  const systemLatency = audioCtx.baseLatency || audioCtx.playbackLatency || 128 / audioCtx.sampleRate;
  const audioSrc = audioCtx.createBufferSource();

  // await audioCtx.resume();
  console.log(systemLatency);
  audioSrc.start(audioCtx.currentTime + systemLatency);
  
  audioCtx.decodeAudioData(arrayBuffer)
  .then(decodedArrayBuffer => {
    audioSrc.buffer = decodedArrayBuffer;
    audioSrc.connect(audioCtx.destination);
  });

  return new Promise(resolve => {
    audioSrc.onended = _ => {
      audioCtx.close().then(resolve);
    };
  });
}