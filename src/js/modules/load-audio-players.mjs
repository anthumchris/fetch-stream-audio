import { AudioPlayer } from './audio-player.mjs';

export default (wrapper) => {
  // Trials showed 16K to be good. Lower values (2K) caused skipping in WAV
  const readBufferSize = 1024 * 16;

  const el = document.createElement('section');
  const player = new AudioPlayer({
    // url: 'https://fetch-stream-audio.local.com/1.5mbps/bubbles.wav',
    // url: 'https://fetch-stream-audio.local.com/1.5mbps/house-41000hz-trim.wav',
    url: 'https://fetch-stream-audio.anthum.com/2mbps/house-41000hz-trim.wav',
    wrapper: el,
    readBufferSize
  });
  wrapper.append(el);
};
