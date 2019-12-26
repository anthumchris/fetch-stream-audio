import { AudioPlayer } from './audio-player.mjs';

const playerData = [
  {
    url: 'https://fetch-stream-audio.local.com/2mbps/house-41000hz-trim.wav',
    // url: 'https://fetch-stream-audio.anthum.com/2mbps/house-41000hz-trim.wav',
    mime: 'audio/wav',
    codec: 'PCM',

    // WAV trials showed 16K to be good. Lower values (2K) caused skipping
    readBufferSize: 1024 * 16
  },
  {
    url: 'https://fetch-stream-audio.local.com/2mbps/bubbles.opus',
    // url: 'https://fetch-stream-audio.local.com/72kbps/bubbles.opus',
    // url: 'https://fetch-stream-audio.anthum.com/2mbps/opus/decode-test-64kbs.opus',
    mime: 'audio/ogg',
    codec: 'Opus',

    // 2-4k seemed good for opus to prevent skipping
    readBufferSize: 1024 * 2
  },
];

export default (wrapper) => {
  const players = [];

  playerData.forEach(({ url, mime, codec, readBufferSize }) => {
    const el = document.createElement('section');
    const player = new AudioPlayer({
      wrapper: el,
      onStateChange,
      url, mime, codec, readBufferSize
    });
  
    wrapper.append(el);
    players.push(player);

    function onStateChange(playbackState) {
      if (playbackState === 'playing') {
        for(let p of players) {
          if (this !== p) {
            p.reset();
          }
        }
      }
    }
  });
};
