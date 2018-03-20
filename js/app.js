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
        AudioPlayer.flushBuffer();
      } else {
        bytesRead+= value.byteLength;
        UI.downloadProgress({bytesRead, bytesTotal})
        AudioPlayer.enqueue(value);
        read();
      }
    }).catch(e => UI.error(e))
  }
})
.catch(e => UI.error(e))


const AudioPlayer = (function() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)(),
        decoder = new MohayonaoWavDecoder();

  /* bytes received must be buffered to ensure decoder receives complete chunks.
   * Otherwise, decoder returns white noise (typically for odd (not even) chunk size).
   * Skipping occurs if too small or if network isn't fast enough.
   * Users must wait too long to hear audio if too large.
   */
  const abSize = 16*1024,
        readBuffer = new Uint8Array(abSize);

  let totalTimeScheduled = 0,   // time scheduled of all AudioBuffers
      playStartedAt = 0,        // audioContext.currentTime of first scheduled play buffer
      abCreated = 0,            // AudioBuffers created
      abEnded = 0,              // AudioBuffers played/ended
      bufferPos = 0;            // readBuffer position (to insert)

  function flushBuffer() {
    const chunk = readBuffer.slice(0,bufferPos),
          decodeStart = performance.now();

    decoder.decodeChunk(chunk)
    .then(data => {
      console.debug('decoded',chunk.byteLength,'bytes in', (performance.now()-decodeStart).toFixed(2)+'ms');
      schedulePlayback(data)
    });

    bufferPos = 0;
  }

  function enqueue(streamChunk) {
    updateUI()

    for (let i=0; i<streamChunk.byteLength; i++) {
      readBuffer[bufferPos++] = streamChunk[i];

      // flush readBuffer to decoder if full
      if (bufferPos === readBuffer.byteLength) {
        flushBuffer();
      }
    }
  }

  function updateUI() {
    UI.bufferUpdate({abSize, abCreated, abEnded});
  }

  function togglePause() {
    if(audioCtx.state === 'running') {
      return audioCtx.suspend().then(_ => true)
    } else if(audioCtx.state === 'suspended') {
      return audioCtx.resume().then(_ => false)
    }
  }

  function schedulePlayback({channelData, length, numberOfChannels, sampleRate}) {
    if (!playStartedAt) {
      playStartedAt = audioCtx.currentTime + (audioCtx.baseLatency || 0.1);
      UI.playing();
    }

    const audioSrc = audioCtx.createBufferSource();

    audioSrc.addEventListener('ended', function() {
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

  return {
    enqueue,
    flushBuffer,
    togglePause
  }
})()



const UI = (function() {
  let elStatus, elProgress, elAbSize, elAbCreated, elAbEnded, elAbRemaining;

  // Pause/Resume with space bar
  document.onkeydown = event => {
    if (event.code === 'Space') {
      AudioPlayer.togglePause()
      .then(isPaused => {
        if (isPaused) paused()
        else playing()
      })
    }
  }

  document.addEventListener('DOMContentLoaded', _ => {
    elStatus = document.getElementById('status');
    elProgress = document.getElementById('progress');
    elAbSize = document.getElementById('abSize');
    elAbCreated = document.getElementById('abCreated');
    elAbEnded = document.getElementById('abEnded');
    elAbRemaining = document.getElementById('abRemaining');
  })


  function downloadProgress({bytesRead, bytesTotal}) {
    if (bytesTotal) {
      let read = bytesRead.toLocaleString();
      let total = bytesTotal.toLocaleString();
      elProgress.innerHTML = `${read} / ${total} bytes (${Math.round(bytesRead/bytesTotal*100)}%)`;
    }
  }

  function bufferUpdate({abSize, abCreated, abEnded}) {
    elAbSize.innerHTML = abSize.toLocaleString()+ ' ('+abSize/1024+'K)';
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
