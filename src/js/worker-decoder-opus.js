import wasm from './opus-stream-decoder/dist/opus-stream-decoder.cjs.js';

let decoder, sessionId;

// currently, WebAssembly decoder must be re-instantiated and can't be reused.
// See https://github.com/AnthumChris/opus-stream-decoder/issues/7
function evalSessionId(newSessionId) {
  // detect new session and reset decoder
  if (sessionId && sessionId === newSessionId) {
    return;
  }

  sessionId = newSessionId;

  // Set temporary decoder.ready that will replaced with OpusStreamDecoder.ready
  // when WASM loads. Currently required for CJS module-based loading.
  decoder = {
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
}

self.onmessage = async (evt) => {
  evalSessionId(evt.data.sessionId);
  await decoder.ready;
  decoder.decode(new Uint8Array(evt.data.decode));
};

function onDecode({left, right, samplesDecoded, sampleRate}) {
  const decoded = {
    channelData: [left, right],
    length: samplesDecoded,
    numberOfChannels: 2,
    sampleRate
  };

  self.postMessage(
    { decoded, sessionId },
    [
      decoded.channelData[0].buffer,
      decoded.channelData[1].buffer
    ]
  );
}
