'use strict'

self.importScripts('MohayonaoWavDecoder.js');

const decoder = new MohayonaoWavDecoder();

self.onmessage = event => {
  if (event.data.decode) {
    const decoded = decoder.decodeChunkSync(event.data.decode);

    // convert decoded data to Transferable ArrayBuffer for performant postMessage
    decoded.channelData = decoded.channelData.map(arr => arr.buffer);
    self.postMessage(decoded, decoded.channelData);
  }
}
