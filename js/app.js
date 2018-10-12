'use strict'

fetch('audio/opus/🐟.--64kbs.opus') // Localhost testing requires CORS config to obtain Content-Length 
.then(response => playResponseAsStream(response, 1024*1024))
.then(_ => console.log('-- done reading stream'))
.catch(e => UI.error(e))


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
        readBufferArray = new Uint8Array(readBuffer);

  let bytesRead = 0, byte, readBufferPos = 0;

  UI.readBufferSize(readBufferSize);

  // TODO errors in underlying Worker must be dealt with here.
  function flushReadBuffer() {
    console.log('flushReadBuffer')
    AudioStreamPlayer.enqueueForDecoding(new Uint8Array(readBufferArray.slice(0, readBufferPos)));
    readBufferPos = 0;
  }

  //
  // let prevChunk = 
  const oggMagicNumber = 1399285583,  // 32-bit unsigned int indicating beginning of Opus bitstream page
        minFlushBuffer = 55*1024;      // minimum byte length to reach before flushing buffer.  this is tricky because of varying page sizes (64kbs has ~ 8,000 bytes, 192kbs around 26,000)

  let bufferView;

  // Fill readBuffer and flush when readBufferSize is reached
  function read() {
    return reader.read().then(({value, done}) => {
      if (done) {
        flushReadBuffer();
        return;
      } else {
        bytesRead+= value.byteLength;
        UI.downloadProgress({bytesRead, bytesTotal})

        for (byte of value) {
          readBufferArray[readBufferPos++] = byte;
        }
        // find page boundaries. for each byte position, read 32-bit integer 
        // bufferView = new DataView(value.buffer)
        // for (let i=0; i<bufferView.byteLength-32; i++) {
        //   if (bufferView.getInt32(i, true) === oggMagicNumber) {
        //     let page = bufferView.getUint16(i+18, true);
        //     console.log('page #', page)
        //     if (page >= 12) {
        //       console.log('readBuffer', readBuffer.byteLength)
        //       // flushReadBuffer();
        //       findPages(readBuffer)
        //       return;
        //     }

        //     // if (readBufferPos >= minFlushBuffer) {
        //     //   flushReadBuffer();
        //     //   if (page >= 4) {
        //     //     return;
        //     //   }
        //     // }
        //   }
        //   readBufferArray[readBufferPos++] = value[i];
        // }

        if (readBufferPos >= readBufferSize) {
          console.log('readBufferPos',readBufferPos)
          findPages(readBuffer)
          reader.cancel();
          return;
        }

        // for (byte of value) {
        //   readBufferArray[readBufferPos++] = byte;
        //   if (readBufferPos === readBufferSize) {
        //     flushReadBuffer();
        //   }
        // }

        return read();
      }
    })
  }

  return read()
}











function findPages(buffer) {
  console.log('buffer', buffer.byteLength)
  const view = new DataView(buffer),
        
        uint8array = new Uint8Array(buffer),
        uint32array = new Uint32Array(buffer),

        decoder = new TextDecoder();

  let pages = [], uint32;

  for (let i=0; i<view.byteLength-32; i++) {
    uint32 = view.getUint32( i, true );
    if (uint32 == 1399285583) {
      let page = view.getUint32(i+18, true);
      // console.log(`----- page ${page} -----`);
      // console.log(uint8array.subarray(i,i+32))
      // console.log(decoder.decode(uint8array.subarray(i,i+32)))
      pages.push(i)
    }
  }
  // for (let i=1; i<pages.length; i++) {
  //   console.log('pageLength', pages[i]-pages[i-1]);
  // }
  // console.log(pages)
  console.log('pages read: '+pages.length)
  // AudioStreamPlayer.enqueueForDecoding(uint8array);

  const sendEvery = 10;
  for (var i=0; i<pages.length-sendEvery; i+=sendEvery) {
    console.log('sending for enqueue');
    AudioStreamPlayer.enqueueForDecoding(uint8array.slice( pages[i], pages[i+sendEvery]));
  }
  if (pages.length%sendEvery) {
    console.log('sending for enqueue');
    AudioStreamPlayer.enqueueForDecoding(uint8array.slice( pages[pages.length-(pages.length%sendEvery)], pages[pages.length-1]));
  }
  // AudioStreamPlayer.enqueueForDecoding(uint8array.slice( pages[0], pages[5]));
  // AudioStreamPlayer.enqueueForDecoding(uint8array.slice( pages[5], pages[10]));
  // AudioStreamPlayer.enqueueForDecoding(uint8array.slice( pages[0], pages[pages.length-1] ));
}















function debugHex(typedArray) {
  let ary = Array.prototype.map.call(typedArray.subarray(0,20), i => i);
  console.log(' int', ary)
  console.log('char', ary.map(i => String.fromCharCode(i)))
  console.log(' hex', ary.map(i => i.toString(16)))
  console.log('----------');
  ary = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  console.log(' int', ary)
  console.log('char', ary.map(i => String.fromCharCode(i)))
  console.log(' hex', ary.map(i => i.toString(16)))  
}

// Main controller for playing chunks enqueued for decoding.  
const AudioStreamPlayer = (function() {
  const worker = new Worker('/js/decoderWorker.js'),
        audioCtx = new (window.AudioContext || window.webkitAudioContext)(),
        audioSrcNodes = []; // Used to fix Safari Bug https://github.com/AnthumChris/fetch-stream-audio/issues/1


  let totalTimeScheduled = 0,   // time scheduled of all AudioBuffers
      playStartedAt = 0,        // audioContext.currentTime of first scheduled play buffer
      abCreated = 0,            // AudioBuffers created
      abEnded = 0;              // AudioBuffers played/ended

  // TODO errors should be signaled to caller
  worker.onerror = event => {};

  worker.onmessage = event => {
    if (event.data) {
      const decoded = event.data;

      // convert Transferrable ArrayBuffer to Float32Array
      // decoded.channelData = decoded.channelData.map(arrayBuffer => new Float32Array(arrayBuffer));
      schedulePlayback({
        channelData: event.data,
        length: event.data[0].length,
        numberOfChannels: event.data.length,
        sampleRate: 48000
      });
    }
  }

  worker.postMessage({ 
    command:'init',
    bufferLength: 8*1024
  });

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

  // arrayBuffer will be inaccessible to caller after performant Transferable postMessage()
  function enqueueForDecoding(typedArray) {
    // worker.postMessage({decode: arrayBuffer}, [arrayBuffer]);
    worker.postMessage({
      command: 'decode',
      pages: typedArray
    }, [typedArray.buffer] );
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
      const startDelay = audioBuffer.duration + (audioCtx.baseLatency || 128 / audioCtx.sampleRate);
      playStartedAt = audioCtx.currentTime + startDelay;
      UI.playing();
    }

    audioSrc.buffer = audioBuffer
    audioSrc.connect(audioCtx.destination);
    audioSrc.start(playStartedAt+totalTimeScheduled);
    totalTimeScheduled+= audioBuffer.duration;
    console.log(audioBuffer.duration)
    // console.l32('totalTimeScheduled',totalTimeScheduled)
  }

  function updateUI() {
    UI.audioBufferUpdate({abCreated, abEnded});
  }

  function togglePause() {
    if(audioCtx.state === 'running') {
      audioCtx.suspend().then(_ => UI.paused())
    } else if(audioCtx.state === 'suspended') {
      audioCtx.resume().then(_ => UI.playing())
    }
  }

  return {
    enqueueForDecoding,
    togglePause
  }
})()


// Controls user interface and display functionality
const UI = (function() {
  const id = document.getElementById.bind(document);

  // display elements
  let elStatus, elProgress, elRbSize, elAbCreated, elAbEnded, elAbRemaining;

  document.addEventListener('DOMContentLoaded', _ => {
    elStatus =      id('status');
    elProgress =    id('progress');
    elRbSize =      id('rbSize');
    elAbCreated =   id('abCreated');
    elAbEnded =     id('abEnded');
    elAbRemaining = id('abRemaining');
  })

  function downloadProgress({bytesRead, bytesTotal}) {
    if (bytesTotal) {
      let read = bytesRead; //.toLocaleString();
      let total = bytesTotal; //.toLocaleString();
      elProgress.innerHTML = `${Math.round(bytesRead/bytesTotal*100)}% ${read}/${total}`;
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
    paused
  }  
})()
