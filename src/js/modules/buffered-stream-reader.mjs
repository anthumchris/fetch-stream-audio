/* Audio file chunks read must be buffered before sending to decoder.
 * Otherwise, decoder returns white noise for odd (not even) chunk size).
 * Skipping/hissing occurs if buffer is too small or if network isn't fast enough.
 * Users must wait too long to hear audio if buffer is too large.
 *
 * Returns Promise that resolves when entire stream is read and bytes queued for decoding
 */
export class BufferedStreamReader {
  onRead;        // callback on every read. useful for speed calcs
  onBufferFull;  // callback when buffer fills or read completes
  request;       // HTTP request we're reading
  buffer;        // buffer we're filling
  bufferPos = 0; // last filled position in buffer
  isRunning;
  abortController;

  constructor(request, readBufferSize) {
    if (!readBufferSize)
      throw Error('readBufferSize not provided');

    this.request = request;
    this.buffer = new Uint8Array(readBufferSize);
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.request = null;
  }

  async read() {
    if (this.isRunning) {
      return console.warn('cannot start - read in progess.');
    }

    this.isRunning = true;

    return this._start()
    .catch(e => {
      if (e.name === 'AbortError') {
        return;
      }
      this.abort();
      throw e;
    })
    .finally(_ => this.isRunning = false);
  }

  async _start() {
    this.abortController = ('AbortController' in window)? new AbortController() : null;
    const signal = this.abortController? this.abortController.signal : null;

    const response = await fetch(this.request, { signal });
    if (!response.ok) throw Error(response.status+' '+response.statusText);
    if (!response.body) throw Error('ReadableStream not yet supported in this browser - <a href="https://developer.mozilla.org/en-US/docs/Web/API/Body/body#Browser_Compatibility">browser compatibility</a>');

    const reader = response.body.getReader(),
          contentLength = response.headers.get('content-length'), // requires CORS access-control-expose-headers: content-length
          totalBytes = contentLength? parseInt(contentLength, 10) : 0;

    let totalRead = 0, byte, readBufferPos = 0;

    const read = async () => {
      const { value, done } = await reader.read();
      const byteLength = value? value.byteLength : 0;
      totalRead+= byteLength;

      if (this.onRead) {
        this.onRead({ bytes: value, totalRead, totalBytes, done });
      }

      // avoid blocking read()
      setTimeout(_ => this._readIntoBuffer({ value, done, request: this.request }));
      // console.log(this.request);
      // this._readIntoBuffer({ value, done });

      if (!done) {
        return read();
      }
    };

    return read();
  }

  _requestIsAborted({ request }) {
    return this.request !== request;
  }

  _flushBuffer({ end, done, request }) {
    if (this._requestIsAborted({ request })) {
      return
    }

    this.onBufferFull({ bytes: this.buffer.slice(0, end), done });
  }

  /* read value into buffer and call onBufferFull when reached */
  _readIntoBuffer ({ value, done, request }) {
    if (this._requestIsAborted({ request })) {
      return
    }

    if (done) {
      this._flushBuffer({ end: this.bufferPos, done, request });
      return;
    }

    const src = value,
          srcLen = src.byteLength,
          bufferLen = this.buffer.byteLength;
    let srcStart = 0,
        bufferPos = this.bufferPos;

    while (srcStart < srcLen) {
      const len = Math.min(bufferLen - bufferPos, srcLen - srcStart);
      const end = srcStart + len;
      this.buffer.set(src.subarray(srcStart, end), bufferPos);
      srcStart += len;
      bufferPos += len;
      if (bufferPos === bufferLen) {
        bufferPos = 0;
        this._flushBuffer({ end: Infinity, done, request });
      }
    }

    this.bufferPos = bufferPos;
  }
}