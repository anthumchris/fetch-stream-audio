import { OpusStreamDecoder } from 'opus-stream-decoder';
import { DecodedAudioPlaybackBuffer } from './modules/decoded-audio-playback-buffer.mjs';

const decoder = new OpusStreamDecoder({ onDecode });
const playbackBuffer = new DecodedAudioPlaybackBuffer({ onFlush });
let sessionId, flushTimeoutId;

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
