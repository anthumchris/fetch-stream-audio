import AudioPlayers from './modules/load-audio-players.mjs';

new AudioPlayers(document.querySelector('main'));

// reload window on hash change until speed/file change feature added
window.onhashchange = window.location.reload.bind(window.location);