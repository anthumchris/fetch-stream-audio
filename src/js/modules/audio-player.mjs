import { AudioStreamPlayer } from './audio-stream-player.mjs';
import { Player } from '../lit-components/player.mjs';

export class AudioPlayer {
  ui;
  audio;

  constructor({ url, wrapper, readBufferSize }) {
    this.ui = new Player(wrapper);
    this.ui.onAction = this._onAction.bind(this);
    this.ui.state.readBuffer = readBufferSize;

    this.audio = new AudioStreamPlayer(url, readBufferSize);
    this.audio.onUpdateState = this._onUpdateState.bind(this);

    this.reset();
  }

  _onAction(action) {
    if (this[action]) {
      this[action]();
    }
  }

  _onUpdateState(state) {
    this.ui.setState(state);
  }

  start() {
    this.audio.start();
  }
  pause() {
    this.audio.pause();
  }
  resume() {
    this.audio.resume();
  }

  reset() {
    this.ui.setState({
      playState: 'init',
      mime: 'audio/wav',
      waiting: null,
      bytesRead: null,
      bytesTotal: null,
      dlRate: null,
      abCreated: null,
      abEnded: null,
      abRemaining: null
    });
  }


}