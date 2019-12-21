import { AudioPlayer } from './audio-player.mjs';

const playerData = [
  {
    // url: 'https://fetch-stream-audio.local.com/1.5mbps/bubbles.wav',
    // url: 'https://fetch-stream-audio.local.com/2mbps/house-41000hz-trim.local.wav',
    url: 'https://fetch-stream-audio.anthum.com/2mbps/house-41000hz-trim.wav',
    mime: 'audio/wav',
    codec: 'PCM',

    // WAV trials showed 16K to be good. Lower values (2K) caused skipping
    readBufferSize: 1024 * 16
  },
];

export default (wrapper) => {
  playerData.forEach(({ url, mime, codec, readBufferSize }) => {
    const el = document.createElement('section');
    const player = new AudioPlayer({
      wrapper: el,
      url, mime, codec, readBufferSize
    });
    wrapper.append(el);
  });
};
