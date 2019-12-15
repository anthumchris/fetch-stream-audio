'use strict'

// await DOM click from user
function start() {
  AudioStreamPlayer.init();

  // Trials showed 16K to be good. Lower values (2K) caused skipping in WAV
  const playbackBufferSize = 1024 * 16;

  // fetch('/nolimit/audio/house-41000hz-trim.wav') // Localhost testing requires CORS config to obtain Content-Length
  fetch('https://fetch-stream-audio.anthum.com/2mbps/house-41000hz-trim.wav')
  .then(response => playResponseAsStream(response, playbackBufferSize))
  .then(_ => console.log('all stream bytes queued for decoding'))
  .catch(e => UI.error(e))
}

/* Chunks read must be buffered before sending to decoder.
 * Otherwise, decoder returns white noise for odd (not even) chunk size).
 * Skipping/hissing occurs if buffer is too small or if network isn't fast enough.
 * Users must wait too long to hear audio if buffer is too large.
 *
 * Returns Promise that resolves when entire stream is read and bytes queued for decoding
 */
function playResponseAsStream(response, readBufferSize) {
  if (!response.ok) throw Error(response.status+' '+response.statusText)
  if (!response.body) throw Error('ReadableStream not yet supported in this browser - <a href="https://developer.mozilla.org/en-US/docs/Web/API/Body/body#Browser_Compatibility">browser compatibility</a>')

  const reader = response.body.getReader(),
        contentLength = response.headers.get('content-length'), // requires CORS access-control-expose-headers: content-length
        bytesTotal = contentLength? parseInt(contentLength, 10) : 0,
        readBuffer = new ArrayBuffer(readBufferSize),
        readBufferView = new Uint8Array(readBuffer);

  let bytesRead = 0, byte, readBufferPos = 0;

  UI.readBufferSize(readBufferSize);

  // TODO errors in underlying Worker must be dealt with here.
  function flushReadBuffer() {
    AudioStreamPlayer.enqueueForDecoding(readBuffer.slice(0, readBufferPos));
    readBufferPos = 0;
  }

  // Fill readBuffer and flush when readBufferSize is reached
  function read() {
    return reader.read().then(({value, done}) => {
      if (done) {
        flushReadBuffer();
        return;
      } else {
        bytesRead+= value.byteLength;

        requestAnimationFrame(_ => {
          const elapsed = performance.now() - getDownloadStartTime()
          UI.downloadProgress({elapsed, bytesRead, bytesTotal})
        })

        for (byte of value) {
          readBufferView[readBufferPos++] = byte;
          if (readBufferPos === readBufferSize) {
            flushReadBuffer();
          }
        }

        return read();
      }
    })
  }

  performance.mark('download-start');
  return read()
}

function getDownloadStartTime() {
  return performance.getEntriesByName('download-start')[0].startTime;
}

// Main controller for playing chunks enqueued for decoding.  
const AudioStreamPlayer = (function() {
  const worker = new Worker('/js/worker-decoder.js'),
        audioSrcNodes = []; // Used to fix Safari Bug https://github.com/AnthumChris/fetch-stream-audio/issues/1


  let totalTimeScheduled = 0,   // time scheduled of all AudioBuffers
      playStartedAt = 0,        // audioContext.currentTime of first scheduled play buffer
      abCreated = 0,            // AudioBuffers created
      abEnded = 0,              // AudioBuffers played/ended
      audioCtx;                 // now requires user gesture to init https://goo.gl/7K7WLu


  // TODO errors should be signaled to caller
  worker.onerror = event => {};

  worker.onmessage = event => {
    if (event.data.channelData) {
      const decoded = event.data;

      // convert Transferrable ArrayBuffer to Float32Array
      decoded.channelData = decoded.channelData.map(arrayBuffer => new Float32Array(arrayBuffer));

      schedulePlayback(decoded);
    }
  }

  // Pause/Resume with space bar
  document.onkeydown = event => {
    if (event.code === 'Space') {
      togglePause();
    }
  }

  function onAudioNodeEnded() {
    audioSrcNodes.shift();
    abEnded++;
    updateUI();
  }

  function init() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
  }

  // arrayBuffer will be inaccessible to caller after performant Transferable postMessage()
  function enqueueForDecoding(arrayBuffer) {
    worker.postMessage({decode: arrayBuffer}, [arrayBuffer]);
  }

  function schedulePlayback({channelData, length, numberOfChannels, sampleRate}) {
    const audioSrc = audioCtx.createBufferSource(),
          audioBuffer = audioCtx.createBuffer(numberOfChannels,length, sampleRate);

    audioSrc.onended = onAudioNodeEnded;
    abCreated++;
    updateUI();

    // ensures onended callback is fired in Safari
    if (window.webkitAudioContext) {
      audioSrcNodes.push(audioSrc);
    }

    // Use performant copyToChannel() if browser supports it
    for (let c=0; c<numberOfChannels; c++) {
      if (audioBuffer.copyToChannel) {
        audioBuffer.copyToChannel(channelData[c], c)
      } else {
        let toChannel = audioBuffer.getChannelData(c);
        for (let i=0; i<channelData[c].byteLength; i++) {
          toChannel[i] = channelData[c][i];
        }
      }
    }

    // initialize first play position.  initial clipping/choppiness sometimes occurs and intentional start latency needed
    // read more: https://github.com/WebAudio/web-audio-api/issues/296#issuecomment-257100626
    if (!playStartedAt) {
      /* this clips in Firefox, plays */
      // const startDelay = audioCtx.baseLatency || (128 / audioCtx.sampleRate);

      /* this doesn't clip in Firefox (256 value), plays */
      const startDelay = audioCtx.baseLatency || (256 / audioCtx.sampleRate);

      /* this could be useful for firefox but outputLatency is about 250ms in FF. too long */
      // const startDelay = audioCtx.outputLatency || audioCtx.baseLatency || (128 / audioCtx.sampleRate);
      console.log({startDelay});

      playStartedAt = audioCtx.currentTime + startDelay;
      UI.playing();
      setTimeout(UI.playbackStart, startDelay*1000);
    }

    audioSrc.buffer = audioBuffer
    audioSrc.connect(audioCtx.destination);
    audioSrc.start(playStartedAt+totalTimeScheduled);
    totalTimeScheduled+= audioBuffer.duration;
  }

  function updateUI() {
    requestAnimationFrame(_ => {
      UI.audioBufferUpdate({abCreated, abEnded});
    })
  }

  function togglePause() {
    if (!audioCtx) {
      start()
    } else if(audioCtx.state === 'running') {
      audioCtx.suspend().then(_ => UI.paused())
    } else if(audioCtx.state === 'suspended') {
      audioCtx.resume().then(_ => UI.playing())
    }
  }

  return {
    init,
    enqueueForDecoding,
    togglePause
  }
})()


// Controls user interface and display functionality
const UI = (function() {
  const id = document.getElementById.bind(document);

  // display elements
  let elStatus, elProgress, elRbSize, elAbCreated, elAbEnded, elAbRemaining, elSpeed, elPlayback;

  document.addEventListener('DOMContentLoaded', _ => {
    elStatus =      id('status');
    elProgress =    id('progress');
    elRbSize =      id('rbSize');
    elAbCreated =   id('abCreated');
    elAbEnded =     id('abEnded');
    elAbRemaining = id('abRemaining');
    elSpeed =       id('speed');
    elPlayback =    id('playbackLatency');
  })

  function downloadProgress({elapsed, bytesRead, bytesTotal}) {
    if (bytesTotal) {
      let read = Math.round(bytesRead/1024).toLocaleString();
      let total = Math.round(bytesTotal/1024).toLocaleString();
      let speed = (bytesRead*8 / (elapsed)).toLocaleString([], {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      elProgress.innerText = `${Math.round(bytesRead/bytesTotal*100)}% ${read}/${total} Kb`;
      elSpeed.innerText = `${speed} kbps`;
    }
  }

  function readBufferSize(readBufferSize) {
    elRbSize.innerHTML = readBufferSize.toLocaleString()+ ' ('+readBufferSize/1024+'K)';
  }

  function audioBufferUpdate({abCreated, abEnded}) {
    elAbCreated.innerHTML = abCreated;
    elAbEnded.innerHTML = abEnded;
    elAbRemaining.innerHTML = abCreated-abEnded;
  }

  function playbackStart() {
    elPlayback.innerText = (performance.now() - getDownloadStartTime()).toFixed(3)+'ms';
  }

  function error(content) {
    console.error(content);
    status(content)
  }

  function status(content) {
    elStatus.innerHTML = content;
  }

  function playing() {
    status('<button onclick="AudioStreamPlayer.togglePause()"><span class="pause"></span>Playing</button>')
  }

  function paused() {
    status('<button onclick="AudioStreamPlayer.togglePause()"><span class="play"></span>Paused</button>')
  }

  return {
    downloadProgress,
    audioBufferUpdate,
    readBufferSize,
    status,
    error,
    playing,
    paused,
    playbackStart
  }  
})()
