'use strict'

// Remote files won't decode properly until enqueue() implements controlled read buffer scheduling
fetch('https://fetch-stream-audio.anthum.com/300kbps/rock-48000hz-trim.wav')
// fetch('https://fetch-stream-audio.anthum.com/300kbps/rock-48000hz-trim-mono.wav')
// fetch('https://fetch-stream-audio.anthum.com/300kbps/house-41000hz-trim.wav')
// fetch('https://fetch-stream-audio.anthum.com/300kbps/house-41000hz-trim-mono.wav')

/* localhost files should decode without issue */
// fetch('https://fetch-stream-audio.local.com/audio/rock-48000hz-trim.wav')
// fetch('https://fetch-stream-audio.local.com/audio/house-41000hz-trim.wav')
.then(response => {
  if (!response.ok) throw Error(response.status+' '+response.statusText)
  if (!response.body) throw Error('ReadableStream not yet supported in this browser - <a href="https://developer.mozilla.org/en-US/docs/Web/API/Body/body#Browser_Compatibility">browser compatibility</a>')

  const reader = response.body.getReader(),
        contentLength = response.headers.get('content-length'), // requires CORS access-control-expose-headers: content-length
        bytesTotal = contentLength? parseInt(contentLength, 10) : 0

  // debug iterations
  let reads = 0, bytesRead = 0;

  read()
  function read() {
    reader.read().then(({value, done}) => {
      if (!done) {
        reads++, bytesRead+= value.byteLength;
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

  let delayNextStart = .3, // timing of next audio buffer.  initialize with intentional delay
      playStarted,          // did playback start
      abCreated = 0;        // AudioBuffers created

  // TODO - this function must schedule a read buffer be a certain size before flushing to decoder. Otherwise, bad decoding occurs resulting in white noise / hissing for those decoded chuncks
  function enqueue(typedArray) {
    // white noise will be decoded odd numbers of bytes
    if (typedArray.byteLength % 2) {
      console.log(abCreated+1, 'AudioBuffer contains odd bytes', typedArray.byteLength % 2, typedArray.byteLength);
    }

    decoder.decodeChunk(typedArray)
    .then(data => playDecodedData(data));
  }

  function togglePause() {
    if(audioCtx.state === 'running') {
      audioCtx.suspend()
      return true;
    } else if(audioCtx.state === 'suspended') {
      audioCtx.resume()
      return false;
    }
  }

  function playDecodedData({channelData, length, numberOfChannels, sampleRate}) {
    const audioSrc = audioCtx.createBufferSource();
    const audioBuffer = new AudioBuffer({
      length,
      numberOfChannels,
      sampleRate
    });
    abCreated++;
    UI.bufferUpdate({abCreated});

    for (let i=0; i<numberOfChannels; i++) {
      audioBuffer.copyToChannel(channelData[i], i)
    }
    // console.log('audioBuffer', audioBuffer)

    audioSrc.buffer = audioBuffer
    audioSrc.connect(audioCtx.destination);
    audioSrc.start(delayNextStart);
    delayNextStart+= audioBuffer.duration;
    if (!playStarted) {
      playStarted = true;
      UI.playing()
    }
  }

  return {
    enqueue,
    togglePause
  }
})()


const UI = (function() {
  let elStatus, elProgress, elAbCreated

  // Pause/Resume with space bar
  document.onkeydown = event => {
    if (event.code === 'Space') {
      if (AudioPlayer.togglePause())
        paused()
      else
        playing()
    }
  }

  document.addEventListener('DOMContentLoaded', evt => {
    elStatus = document.getElementById('status');
    elProgress = document.getElementById('progress');
    elAbCreated = document.getElementById('abCreated');
  })


  function downloadProgress({bytesRead, bytesTotal}) {
    if (bytesTotal) {
      let read = bytesRead.toLocaleString();
      let total = bytesTotal.toLocaleString();
      elProgress.innerHTML = `${read} / ${total} bytes (${Math.round(bytesRead/bytesTotal*100)}%)`;
    }
  }

  function bufferUpdate({abCreated}) {
    elAbCreated.innerHTML = abCreated;
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
