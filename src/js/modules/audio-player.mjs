import { AudioStreamPlayer } from './audio-stream-player.mjs';
import { Player } from '../lit-components/player.mjs';

export class AudioPlayer {
  _ui;
  _audio;
  _readSize;
  _mime;
  _codec;

  constructor({ url, wrapper, readBufferSize, mime, codec }) {
    this._readSize = readBufferSize
    this._ui = new Player(wrapper);
    this._ui.onAction = this._onAction.bind(this);

    this._audio = new AudioStreamPlayer(url, readBufferSize);
    this._audio.onUpdateState = this._onUpdateState.bind(this);

    this._mime = mime;
    this._codec = codec;

    this.reset();
  }

  _onAction(action) {
    if (this[action]) {
      this[action]();
    }
  }

  _onUpdateState(state) {
    this._ui.setState(state);
  }

  start() {
    this._audio.start();
    this._ui.state.readBuffer = this._readSize;
  }
  pause() {
    this._audio.pause();
  }
  resume() {
    this._audio.resume();
  }

  reset() {
    this._audio.close();
    this._ui.setState({
      playState: 'init',
      mime: this._mime,
      codec: this._codec,
      waiting: null,
      bytesRead: null,
      bytesTotal: null,
      dlRate: null,
      abCreated: null,
      abEnded: null,
      abRemaining: null,
      error: null,
      readBuffer: null
    });
  }


}