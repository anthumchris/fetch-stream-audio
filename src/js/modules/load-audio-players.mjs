import { AudioPlayer } from './audio-player.mjs';

const playerData = [
  {
    url: `https://www.radioultramix.com:8443/live.caf`,
    mime: 'audio/ogg',
    codec: 'Opus',
    decoder: 'WebAssembly',

    // 2-4k seemed good for opus to prevent skipping; larger delays audio start
    readBufferSize: 1024 * 2
  },
];

export default (wrapper) => {
  const players = [];

  playerData.forEach(({ url, mime, codec, readBufferSize, decoder }) => {
    const el = document.createElement('section');
    const player = new AudioPlayer({
      wrapper: el,
      onStateChange,
      url, mime, codec, readBufferSize, decoder
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
