self.importScripts('MohayonaoWavDecoder.js');

/* bytes received must be buffered to ensure decoder receives complete chunks.
 * Otherwise, decoder returns white noise (typically for odd (not even) chunk size).
 * Skipping occurs if too small or if network isn't fast enough.
 * Users must wait too long to hear audio if too large.
 */
const DecodeBuffer = (function() {
  const decoder = new MohayonaoWavDecoder();

  let pos = 0, readBufferSize, readBuffer;

  function init(options) {
    if (!options.readBufferSize) ensureInitialization();

    readBufferSize = options.readBufferSize || 16*1024;
    readBuffer = new Uint8Array(readBufferSize);
  }

  function flush() {
    ensureInitialization();

    const decoded = decoder.decodeChunkSync(readBuffer.slice(0,pos))

    // convert decoded data to Transferable ArrayBuffer for performant postMessage
    decoded.channelData = decoded.channelData.map(arr => arr.buffer);
    self.postMessage(decoded, decoded.channelData);

    pos = 0;
  }

  function enqueue(buffer) {
    ensureInitialization();

    const typedArray = new Uint8Array(buffer);
    for (let i=0; i<typedArray.byteLength; i++) {
      readBuffer[pos++] = typedArray[i];
      if (readBufferSize === pos) flush();
    }
  }

  function ensureInitialization() {
    if (!readBuffer) throw Error('Worker must receive "init" postMessage with readBufferSize');
  }

  return {
    init,
    flush,
    enqueue
  }
})()

self.onmessage = event => {
  if (event.data.init) {
    DecodeBuffer.init(event.data.init);
  } else if (event.data.decode) {
    DecodeBuffer.enqueue(event.data.decode);
  } else if (event.data.flush) {
    DecodeBuffer.flush();
  }
}