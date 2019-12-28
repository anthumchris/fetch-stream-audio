import wasm from './opus-stream-decoder/dist/opus-stream-decoder.cjs.js';
import { DecodedAudioPlaybackBuffer } from './modules/decoded-audio-playback-buffer.mjs';

const playbackBuffer = new DecodedAudioPlaybackBuffer({ onFlush });
let sessionId, flushTimeoutId;

// Set temporary decoder.ready that will replaced with OpusStreamDecoder.ready
// when WASM loads. Currently required for CJS module-based loading.
let decoder = {
  ready: new Promise(resolve => {
    wasm({
      onRuntimeInitialized() {
        decoder = new this.OpusStreamDecoder({ onDecode });
        console.log('WASM decoder ready');
        resolve();
      }
    });
  })
};

function evalSessionId(newSessionId) {
  // detect new session and reset decoder
  if (sessionId && sessionId === newSessionId) {
    return;
  }

  sessionId = newSessionId;
  playbackBuffer.reset();
}

self.onmessage = async (evt) => {
  evalSessionId(evt.data.sessionId);
  await decoder.ready;
  decoder.decode(new Uint8Array(evt.data.decode));
};

function onDecode({ left, right, samplesDecoded, sampleRate }) {
  // Decoder recovers when it receives new files, and samplesDecoded is negative.
  // For cause, see https://github.com/AnthumChris/opus-stream-decoder/issues/7
  if (samplesDecoded < 0) {
    return;
  }

  playbackBuffer.add({ left, right});
  scheduleLastFlush();
}

function onFlush({ left, right }) {
  const decoded = {
    channelData: [left, right],
    length: left.length,
    numberOfChannels: 2,
    sampleRate: 48000
  };

  self.postMessage(
    { decoded, sessionId },
    [
      decoded.channelData[0].buffer,
      decoded.channelData[1].buffer
    ]
  );
}

// No End of file is signaled from decoder. This ensures last bytes always flush
function scheduleLastFlush() {
  clearTimeout(flushTimeoutId);
  flushTimeoutId = setTimeout(_ => {
    playbackBuffer.flush();
  }, 100);
}
