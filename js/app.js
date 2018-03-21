'use strict'

// fetch('https://fetch-stream-audio.anthum.com/nolimit/rock-48000hz-trim.wav')
// fetch('https://fetch-stream-audio.anthum.com/300kbps/rock-48000hz-trim.wav')
fetch('https://fetch-stream-audio.anthum.com/200kbps/rock-48000hz-trim.wav')
// fetch('https://fetch-stream-audio.anthum.com/192kbps/rock-48000hz-trim.wav')
// fetch('https://fetch-stream-audio.anthum.com/180kbps/rock-48000hz-trim.wav')
// fetch('https://fetch-stream-audio.anthum.com/300kbps/rock-48000hz-trim-mono.wav')
// fetch('https://fetch-stream-audio.anthum.com/300kbps/house-41000hz-trim.wav')
// fetch('https://fetch-stream-audio.anthum.com/300kbps/house-41000hz-trim-mono.wav')

/* localhost */
// fetch('audio/rock-48000hz-trim.wav')
// fetch('audio/house-41000hz-trim.wav')
.then(response => {
  if (!response.ok) throw Error(response.status+' '+response.statusText)
  if (!response.body) throw Error('ReadableStream not yet supported in this browser - <a href="https://developer.mozilla.org/en-US/docs/Web/API/Body/body#Browser_Compatibility">browser compatibility</a>')

  const reader = response.body.getReader(),
        contentLength = response.headers.get('content-length'), // requires CORS access-control-expose-headers: content-length
        bytesTotal = contentLength? parseInt(contentLength, 10) : 0

  let bytesRead = 0;

  read()
  function read() {
    reader.read().then(({value, done}) => {
      if (done) {
        AudioStreamPlayer.enqueueDone();
      } else {
        bytesRead+= value.byteLength;
        UI.downloadProgress({bytesRead, bytesTotal})
        
        // TODO errors in underlying Worker must be dealt with here.
        AudioStreamPlayer.enqueue(value.buffer);

        read();
      }
    }).catch(e => UI.error(e))
  }
})
.catch(e => UI.error(e))



const AudioStreamPlayer = (function() {
  const readBufferSize = 16*1024,
        worker = new Worker('/js/worker-decoder.js'),
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  let totalTimeScheduled = 0,   // time scheduled of all AudioBuffers
      playStartedAt = 0,        // audioContext.currentTime of first scheduled play buffer
      abCreated = 0,            // AudioBuffers created
      abEnded = 0;              // AudioBuffers played/ended

  // worker requires initialization
  worker.postMessage({init: {readBufferSize}});

  // TODO errors should be signaled to caller
  worker.onerror = event => {};

  worker.onmessage = event => {
    if (event.data.channelData) {
      const decoded = event.data;

      // convert Transferrable ArrayBuffer to Float32Array
      decoded.channelData = decoded.channelData.map(buffer => new Float32Array(buffer));

      schedulePlayback(decoded);
    }
  }

  // arrayBuffer will be inaccessible to caller after performant Transferable postMessage()
  function enqueue(arrayBuffer) {
    worker.postMessage({decode: arrayBuffer}, [arrayBuffer]);
  }

  function enqueueDone() {
    worker.postMessage({flush: true});
  }

  function schedulePlayback({channelData, length, numberOfChannels, sampleRate}) {
    // initialize first play position.  initial clipping/weirdness may occur and explicit latency may be needed
    if (!playStartedAt) {
      playStartedAt = audioCtx.currentTime + (audioCtx.baseLatency || 0.1);
      UI.playing();
    }

    const audioSrc = audioCtx.createBufferSource();

    audioSrc.addEventListener('ended', _ => {
      abEnded++;
      updateUI();
    })

    const audioBuffer = new AudioBuffer({
      length,
      numberOfChannels,
      sampleRate
    });
    abCreated++;
    updateUI();

    for (let i=0; i<numberOfChannels; i++) {
      audioBuffer.copyToChannel(channelData[i], i)
    }
    audioSrc.buffer = audioBuffer
    audioSrc.connect(audioCtx.destination);

    audioSrc.start(playStartedAt+totalTimeScheduled);
    totalTimeScheduled+= audioBuffer.duration;
  }

  function updateUI() {
    UI.bufferUpdate({readBufferSize, abCreated, abEnded});
  }

  function togglePause() {
    if(audioCtx.state === 'running') {
      return audioCtx.suspend().then(_ => true)
    } else if(audioCtx.state === 'suspended') {
      return audioCtx.resume().then(_ => false)
    }
  }

  return {
    enqueue,
    enqueueDone,
    togglePause
  }
})()



const UI = (function() {
  const id = document.getElementById.bind(document);

  let elStatus, elProgress, elAbSize, elAbCreated, elAbEnded, elAbRemaining;

  // Pause/Resume with space bar
  document.onkeydown = event => {
    if (event.code === 'Space') {
      AudioStreamPlayer.togglePause()
      .then(isPaused => {
        if (isPaused) paused()
        else playing()
      })
    }
  }

  document.addEventListener('DOMContentLoaded', _ => {
    elStatus =      id('status');
    elProgress =    id('progress');
    elAbSize =      id('abSize');
    elAbCreated =   id('abCreated');
    elAbEnded =     id('abEnded');
    elAbRemaining = id('abRemaining');
  })

  function downloadProgress({bytesRead, bytesTotal}) {
    if (bytesTotal) {
      let read = bytesRead.toLocaleString();
      let total = bytesTotal.toLocaleString();
      elProgress.innerHTML = `${read} / ${total} bytes (${Math.round(bytesRead/bytesTotal*100)}%)`;
    }
  }

  function bufferUpdate({readBufferSize, abCreated, abEnded}) {
    elAbSize.innerHTML = readBufferSize.toLocaleString()+ ' ('+readBufferSize/1024+'K)';
    elAbCreated.innerHTML = abCreated;
    elAbEnded.innerHTML = abEnded;
    elAbRemaining.innerHTML = abCreated-abEnded;
  }

  function error(content) {
    status(content)
  }

  function status(content) {
    elStatus.innerHTML = content;
  }

  function playing() {
    status('⏸️️Playing')
  }

  function paused() {
    status('️▶️Paused')
  }

  return {
    downloadProgress,
    bufferUpdate,
    status,
    error,
    playing,
    paused
  }  
})()
