import MohayonaoWavDecoder from './MohayonaoWavDecoder.js';

const decoder = new MohayonaoWavDecoder();

self.onmessage = event => {
  if (event.data.decode) {
    const decoded = decoder.decodeChunkSync(event.data.decode);
    self.postMessage(decoded, [
      decoded.channelData[0].buffer,
      decoded.channelData[1].buffer
    ]);
  }
}
