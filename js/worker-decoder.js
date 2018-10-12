'use strict'

self.importScripts('MohayonaoWavDecoder.js');

let closedOnError,  // This worker will close/terminate if any errors occur
    decodeMethod;   // decode function assigned (WAV or Opus) 

self.onerror = errorEvent => {
  console.error(errorEvent)
  // console.log(errorEvent);
  closedOnError = true;
  close();
}

self.onmessage = event => {
  if (closedOnError)
    return;

  // decode buffer received
  if (event.data.decode) {
    if (!decodeMethod) evalStreamType(event.data.decode)

    const decoded = decodeMethod(event.data.decode);

    // convert decoded data to Transferable ArrayBuffer for performant postMessage
    decoded.channelData = decoded.channelData.map(arr => arr.buffer);
    self.postMessage(decoded, decoded.channelData);
  }
}

// assign decodeMethod by evaluating the file header and determing file type (magic number)
function evalStreamType(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);

  // read magic number (first 4 letters)
  let magicNumber = Array.prototype.map.call(view.subarray(0,4), i => String.fromCharCode(i)).join('')
  if (['RIFF','WAVE'].includes(magicNumber)) {
    const decoder = new MohayonaoWavDecoder();
    decodeMethod = decoder.decodeChunkSync.bind(decoder);
  } else if ('OggS' === magicNumber) {
    console.log('Ogg File')
    decodeMethod = function() {}
  } else {
    throw Error('No decoder for magicNumber: '+magicNumber);
  }
}
