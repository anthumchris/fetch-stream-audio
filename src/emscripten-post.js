// Dont' use ES6 features like const, let, arrow functions. Emcc minification
// will fail. Used old-school JS.

Module['OpusStreamDecoder'] = OpusStreamDecoder;

// nodeJS only
if ('undefined' !== typeof global && exports) {
  // uncomment this for performance testing
  // var {performance} = require('perf_hooks');
  // global.performance = performance;
}

// Decoder will pass decoded PCM data to onDecode
function OpusStreamDecodedAudio(left, right, samplesDecoded) {
  this.left = left;
  this.right = right;
  this.samplesDecoded = samplesDecoded;
  this.sampleRate = 48000;
}

// Pass options to create new decoder. Only currently supports options.onDecode
// onDecode will receive OpusStreamDecodedAudio object
function OpusStreamDecoder(options) {
  if ('function' !== typeof options.onDecode)
    throw Error('onDecode callback is required.');

  // set as read-only
  Object.defineProperty(this, 'onDecode', {value: options.onDecode});
}

// Emscripten will resolve this promise when Wasm is instantiated
OpusStreamDecoder.prototype.ready = new Promise(function(resolve, reject) {
  // queue the promise to resolve within Emscripten's init loop
  addOnPreMain(function() {
    var api = {
      malloc: cwrap('malloc', 'number', ['number']),
      free: cwrap('free', null, ['number']),
      HEAPU8: HEAPU8,
      HEAPF32: HEAPF32,

      libopusVersion: cwrap('opus_get_version_string', 'string', []),
      decoderVersion: cwrap('opus_chunkdecoder_version', 'string', []),
      createDecoder: cwrap('opus_chunkdecoder_create', null, []),
      freeDecoder: cwrap('opus_chunkdecoder_free', null, ['number']),
      enqueue: cwrap('opus_chunkdecoder_enqueue', null, ['number', 'number', 'number']),
      decode: cwrap('opus_chunkdecoder_decode_float_stereo_deinterleaved', 'number', ['number', 'number', 'number', 'number']),
    }

    // make api read-only
    Object.freeze(api);
    Object.defineProperty(OpusStreamDecoder.prototype, 'api', {value: api});

    resolve();
  });

  // Propagate error to OpusStreamDecoder.ready.catch()
  // WARNING: this is a hack based Emscripten's current abort() implementation
  // and could break in the future.
  // Rewrite existing abort(what) function to reject Promise before it executes.
  var origAbort = this.abort;
  this.abort = function(what) {
    console.log('abort')
    reject(Error(what));
    origAbort.call(this, what);
  }
});

/*
    Decodes audio and calls onDecode with OpusStreamDecodedAudio object. Interleaved
    buffer is reused over multiple Wasm decode() calls because internal C Opus
    decoding library requires it, and a custom C function then deinterleaves
    it.  We're only concerned with returning left/right channels, but the
    interleaved buffer is reused for performance hopes.
 */
OpusStreamDecoder.prototype.decode = function(uint8array) {
  if (!(uint8array instanceof Uint8Array))
    throw Error('Data to decode must be Uint8Array');

  if (!this._decoderPointer) {
    this._decoderPointer = this.api.createDecoder();
  }

  var srcPointer, decodedInterleavedPtr, decodedInterleavedArry,
      decodedLeftPtr, decodedLeftArry,
      decodedRightPtr, decodedRightArry;

  try {
    // put source data to decode on Wasm HEAP and get pointer to it
    var srcLen = uint8array.byteLength;
    srcPointer = this.api.malloc(uint8array.BYTES_PER_ELEMENT * srcLen);
    this.api.HEAPU8.set(uint8array, srcPointer);

    // TODO throttle bytes received to 16k to prevent > 64k being enqueued at once
    // (Firefox returns large local chunks during tests)

    // enqueue bytes to decode. Fail on error
    if (!this.api.enqueue(this._decoderPointer, srcPointer, srcLen))
      throw Error('Could not enqueue bytes for decoding.  You may also have invalid Ogg Opus file.');

    // 120ms buffer recommended per http://opus-codec.org/docs/opusfile_api-0.7/group__stream__decoding.html
    var decodedPcmSize = 120*48*2; // 120ms @ 48 khz * 2 channels.

    // All decoded PCM data will go into these arrays.  Pass pointers to Wasm
    [decodedInterleavedPtr, decodedInterleavedArry] = this.createOutputArray(decodedPcmSize);
    [decodedLeftPtr, decodedLeftArry] = this.createOutputArray(decodedPcmSize/2);
    [decodedRightPtr, decodedRightArry] = this.createOutputArray(decodedPcmSize/2);

    // // continue to decode until no more bytes are left to decode
    var samplesDecoded, totalSamplesDecoded = 0;
    // var decodeStart = performance.now();
    while (samplesDecoded = this.api.decode(
      this._decoderPointer,
      decodedInterleavedPtr,
      decodedPcmSize,
      decodedLeftPtr,
      decodedRightPtr
    )) {
      // performance audits show 960 samples (20ms) of data being decoded per call
      // console.log('decoded',(samplesDecoded/48000*1000).toFixed(2)+'ms in', (performance.now()-decodeStart).toFixed(2)+'ms');

      totalSamplesDecoded+=samplesDecoded;
      // return copies of decoded bytes because underlying buffers will be re-used
      this.onDecode(new OpusStreamDecodedAudio(
        decodedLeftArry.slice(0, samplesDecoded),
        decodedRightArry.slice(0, samplesDecoded),
        samplesDecoded
      ));

      // decodeStart = performance.now();
    }
  } catch (e) {
    throw e;
  } finally {
    // free wasm memory
    this.api.free(srcPointer);
    this.api.free(decodedInterleavedPtr);
    this.api.free(decodedLeftPtr);
    this.api.free(decodedRightPtr);
  }
}

OpusStreamDecoder.prototype.free = function() {
  if (this._decoderPointer) {
    this.api.freeDecoder(this._decoderPointer);
  }
}

// creates Float32Array on Wasm heap and returns it and its pointer
// returns [pointer, array]
// free(pointer) must be done after using it.
// array values cannot be gauranteed since memory space may be reused
// call array.fill(0) if instantiation is required
// set as read-only
Object.defineProperty(OpusStreamDecoder.prototype, 'createOutputArray', {
  value: function(length) {
    var pointer = this.api.malloc(Float32Array.BYTES_PER_ELEMENT * length);
    var array = new Float32Array(this.api.HEAPF32.buffer, pointer, length);
    return [pointer, array];
  }
});