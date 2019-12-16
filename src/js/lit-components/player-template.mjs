import { html } from 'lit-html';

const decimals = 3;

function bytesFormatted(val) {
  return Math.round(val/1024).toLocaleString();
}

function decimal(val) {
  return val.toLocaleString([], { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default ({ 
  playState, mime, waiting,
  bytesRead, bytesTotal, readBuffer, dlRate,
  abCreated, abEnded, abRemaining,
  onClick
}) => html`
  <div class="player">
    <h2>
      ${mime}
      <span id="status">
        <button ?hidden=${playState !== 'init'}    @click=${onClick} data-action="start"  class="start">Start</button>
        <button ?hidden=${playState !== 'playing'} @click=${onClick} data-action="pause"  class="pause">Playing</button>
        <button ?hidden=${playState !== 'paused'}  @click=${onClick} data-action="resume" class="play">Paused</button>
      <span>
    </h2>
    <dl>
      <dt>Playback Waiting</dt>
      <dd>${waiting
            ? html`${decimal(waiting)} ms`
            : null
          }</dd>

      <dt>Downloaded</dt>
      <dd>${bytesRead
            ? html`${Math.round(bytesRead/bytesTotal*100)}%
                   ${bytesFormatted(bytesRead)}/${bytesFormatted(bytesTotal)} Kb`
            : null
          }</dd>

      <dt>Download Speed</dt>
      <dd>${dlRate
            ? html`${decimal(dlRate)} kbps`
            : null
          }</dd>

      <dt>AudioBuffer Created</dt>
      <dd>${abCreated !== null? abCreated.toLocaleString() : null}</dd>

      <dt>AudioBuffer Played</dt>
      <dd>${abEnded !== null? abEnded.toLocaleString() : null}</dd>

      <dt>AudioBuffer Unplayed</dt>
      <dd>${abRemaining !== null ? abRemaining.toLocaleString() : null}</dd>

      <dt>Read / Decode Buffer</dt>
      <dd>${readBuffer
            ? html`${readBuffer.toLocaleString()} (${bytesFormatted(readBuffer)}K)`
            : null
          }</dd>
    </dl>
  </div>
`;
