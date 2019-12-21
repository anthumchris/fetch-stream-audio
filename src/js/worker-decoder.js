import MohayonaoWavDecoder from './MohayonaoWavDecoder.js';

const decoder = new MohayonaoWavDecoder();

self.onmessage = event => {
  const { decode, sessionId } = event.data;
  if (decode) {
    const decoded = decoder.decodeChunkSync(event.data.decode);
    self.postMessage({ decoded, sessionId }, [
      decoded.channelData[0].buffer,
      decoded.channelData[1].buffer
    ]);
  }
}
