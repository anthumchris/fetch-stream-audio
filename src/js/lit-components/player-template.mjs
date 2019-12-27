import { html } from 'lit-html';

const decimals = 3;

function bytesFormatted(val) {
  const kb = val/1024;
  return kb < 0.5? kb.toFixed(2) : Math.round(kb).toLocaleString();
}

function decimal(val) {
  return val.toLocaleString([], { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default ({ 
  playState, mime, codec, waiting,
  bytesRead, bytesTotal, readBuffer, dlRate,
  abCreated, abEnded, abRemaining,
  onClick, error, decoder
}) => html`
  <div class="player">
    <div class="header">
      <div>
        <span class="status">
          <button ?hidden=${playState !== 'init'}    @click=${onClick} data-action="start"  class="start">Start</button>
          <button ?hidden=${playState !== 'playing'} @click=${onClick} data-action="pause"  class="pause">Playing</button>
          <button ?hidden=${playState !== 'paused'}  @click=${onClick} data-action="resume" class="play">Paused</button>
        </span>
      </div>
      <div ?hidden=${playState === 'init'} class="center"><button class="none" @click=${onClick} data-action="reset">Reset</button></div>
      <div class="center">
        <h2>
          ${mime}
          ${codec? html`<br><span>${codec}</span>` : null}
        </h2>
      </div>
    </div>
    <div class="error">${error? html`${error}` : null}</div>
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

    </dl>
    <dl>
      <dt>Decoder</dt>
      <dd class="static">${decoder}</dd>

      <dt>Read / Decode Buffer</dt>
      <dd class="static">${readBuffer
            ? html`${readBuffer.toLocaleString()} (${bytesFormatted(readBuffer)}K)`
            : null
          }</dd>
    </dl>
  </div>
`;
