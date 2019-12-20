import { BufferedStreamReader } from './buffered-stream-reader.mjs';

export class AudioStreamPlayer {
  _worker = new Worker('../worker-decoder.js');
  _audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });

  _audioSrcNodes = []; // Used to fix Safari Bug https://github.com/AnthumChris/fetch-stream-audio/issues/1
  _totalTimeScheduled = 0;   // time scheduled of all AudioBuffers
  _playStartedAt = 0;        // audioContext.currentTime of first sched
  _abCreated = 0;            // AudioBuffers created
  _abEnded = 0;              // AudioBuffers played/ended

  constructor(url, readBufferSize) {
    this._worker.onerror = event => {
      this._updateState({ error: event.message });
    };
    this._worker.onmessage = this._onWorkerMessage.bind(this);

    // pause for now
    // this._audioCtx.suspend().then(_ => console.log('audio paused'));

    const reader = new BufferedStreamReader(new Request(url), 1024 * 4);
    reader.onRead = this._downloadProgress.bind(this);
    reader.onBufferFull = this._decode.bind(this);

    this._reader = reader;
  }

  start() {
    performance.mark('download-start');
    this._reader.read()
    .catch(e => {
      this._updateState({ error: e.toString() });
    })
    this._updateState({ playState: 'playing'});
  }

  pause() {
    this._audioCtx.suspend().then(_ => this._updateState({ playState: 'paused'}));
  }
  resume() {
    this._audioCtx.resume().then(_ => this._updateState({ playState: 'playing'}));
  }

  _updateState(props) {
    const abState = !this._abCreated? {} : {
      abCreated: this._abCreated,
      abEnded: this._abEnded,
      abRemaining: this._abCreated - this._abEnded,
    }
    const state = Object.assign(abState, props);
    if (this.onUpdateState) {
      this.onUpdateState(state);
    }
  }

  _decode({ bytes, done }) {
    this._worker.postMessage({ decode: bytes.buffer }, [bytes.buffer]);
  }

  _onWorkerMessage(event) {
    if (event.data.channelData) {
      const decoded = event.data;
      this._schedulePlayback(decoded);
    }
  }

  _downloadProgress({ bytes, totalRead, totalBytes, done }) {
    this._updateState({
      bytesRead: totalRead,
      bytesTotal: totalBytes,
      dlRate: totalRead*8 / (performance.now() - this._getDownloadStartTime())
    });
    // console.log(done, (totalRead/totalBytes*100).toFixed(2) );
  }

  _getDownloadStartTime() {
    return performance.getEntriesByName('download-start')[0].startTime;
  }

  _schedulePlayback({channelData, length, numberOfChannels, sampleRate}) {
    const audioSrc = this._audioCtx.createBufferSource(),
          audioBuffer = this._audioCtx.createBuffer(numberOfChannels,length, sampleRate);

    audioSrc.onended = () => {
      this._audioSrcNodes.shift();
      this._abEnded++;
      this._updateState();
    };
    this._abCreated++;
    this._updateState();

    // ensures onended callback is fired in Safari
    if (window.webkitAudioContext) {
      this._audioSrcNodes.push(audioSrc);
    }

    // Use performant copyToChannel() if browser supports it
    for (let c=0; c<numberOfChannels; c++) {
      if (audioBuffer.copyToChannel) {
        audioBuffer.copyToChannel(channelData[c], c);
      } else {
        let toChannel = audioBuffer.getChannelData(c);
        for (let i=0; i<channelData[c].byteLength; i++) {
          toChannel[i] = channelData[c][i];
        }
      }
    }

    let startDelay = 0;
    // initialize first play position.  initial clipping/choppiness sometimes occurs and intentional start latency needed
    // read more: https://github.com/WebAudio/web-audio-api/issues/296#issuecomment-257100626
    if (!this._playStartedAt) {
      /* this clips in Firefox, plays */
      // const startDelay = audioCtx.baseLatency || (128 / audioCtx.sampleRate);

      /* this doesn't clip in Firefox (256 value), plays */
      startDelay = this._audioCtx.baseLatency || (256 / this._audioCtx.sampleRate);

      /* this could be useful for firefox but outputLatency is about 250ms in FF. too long */
      // const startDelay = audioCtx.outputLatency || audioCtx.baseLatency || (128 / audioCtx.sampleRate);

      this._playStartedAt = this._audioCtx.currentTime + startDelay;
      this._updateState({ waiting: performance.now() - this._getDownloadStartTime() + startDelay*1000 });
    }

    audioSrc.buffer = audioBuffer;
    audioSrc.connect(this._audioCtx.destination);
    audioSrc.start(this._playStartedAt + this._totalTimeScheduled);
    if (startDelay) {
      this._updateState({ waiting: performance.now() - this._getDownloadStartTime() + startDelay*1000 });
    }

    this._totalTimeScheduled+= audioBuffer.duration;
  }
}
