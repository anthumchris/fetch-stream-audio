#include "opus_chunkdecoder.h"


static int cb_read(OpusChunkDecoder *decoder, unsigned char *_ptr, int _nbytes) {
  // don't read from buffer if OggOpusFile not instantiated yet
  if (!decoder->of) return 0;

  // don't read more than what's available to read
  if (_nbytes > decoder->buffer.num_unread) {
    _nbytes = decoder->buffer.num_unread;
  }

  // fprintf(stderr, "cb_read, _nbytes %i, queued %6i\n", _nbytes, decoder->buffer.num_unread);

  if (_nbytes) {
    memcpy( _ptr, decoder->buffer.cursor, _nbytes);

    decoder->buffer.cursor += _nbytes;
    decoder->buffer.num_unread -= _nbytes;

    // debug
    // fwrite(_ptr, sizeof(*_ptr), _nbytes, outfile_rewrite);
  }
  // cb_read_total_bytes += _nbytes;
  return _nbytes;
}

/* TODO prevent segmentation fault that could occur from buffer overflow
 * if too many undecoded bytes are enqueued before they are decoded.
 * decoder->buffer would overflow.
 *
 * Feed opus audio data for decoding.  Calling program should enqueue and decode
 * immedately after decoding to reduce decoding latency and reduce size of
 * undecoded decoder->buffer data.
 */
void opus_chunkdecoder_enqueue(OpusChunkDecoder *decoder, unsigned char *data, size_t size) {
  decoder->buffer.cursor = decoder->buffer.start;

  /*
    initialize OggOpusFile if not yet initialized.  A few attempts are needed
    until enough bytes are collected for it to instantiate
  */
  if (!decoder->of) {
    memcpy( decoder->buffer.cursor + decoder->buffer.num_unread, data, size );
    decoder->buffer.num_unread += size;

    int err;

    decoder->of = op_open_callbacks(
      decoder,
      &decoder->cb,
      decoder->buffer.cursor,
      decoder->buffer.num_unread,
      &err
    );

    if (err == 0) {
      fprintf(stderr, "OggOpusFile instanted after reading %zd bytes\n", decoder->buffer.num_unread);

      // OggOpusFile instantiated.  Reset buffer
      decoder->buffer.num_unread = 0;
    }
  } else {
    // set buffer to new data
    decoder->buffer.num_unread = size;
    memcpy( decoder->buffer.cursor, data, size );
  }
}

// returns total samples decoded
int opus_chunkdecoder_decode_float_stereo(OpusChunkDecoder *decoder, float *pcm_out, int pcm_out_size) {
  if (!decoder->of) return 0;
  return op_read_float_stereo(decoder->of, pcm_out, pcm_out_size);
}

// returns total samples decoded.  convenience function for deinterlacing
int opus_chunkdecoder_decode_float_stereo_deinterleaved(OpusChunkDecoder *decoder, float *pcm_out, int pcm_out_size, float *left, float *right) {
  int samples_decoded = opus_chunkdecoder_decode_float_stereo(decoder, pcm_out, pcm_out_size);
  opus_chunkdecoder_deinterleave(pcm_out, samples_decoded, left, right);
  return samples_decoded;
}

static ByteBuffer create_bytebuffer() {
  ByteBuffer cb;
  cb.start = cb._data;
  cb.cursor = cb._data;
  cb.num_unread = 0;
  return cb;
}

OpusChunkDecoder *opus_chunkdecoder_create() {
  OpusChunkDecoder decoder;
  decoder.cb.read = (int (*)(void *, unsigned char *, int))cb_read;
  decoder.cb.seek = NULL;
  decoder.cb.tell = NULL;
  decoder.cb.close = NULL;
  decoder.of = NULL;
  decoder.buffer = create_bytebuffer();

  OpusChunkDecoder *ptr = malloc(sizeof(decoder));
  *ptr = decoder;
  return ptr;
}

void opus_chunkdecoder_free(OpusChunkDecoder *decoder) {
  op_free(decoder->of);
  free(decoder);
}

char* opus_chunkdecoder_version() {
  return "opus chunkdecoder 0.1";
}

void opus_chunkdecoder_deinterleave(float *interleaved, int total_samples, float *left, float *right) {
  for (int i=0; i<total_samples; i++) {
    left[i] =  interleaved[i*2];
    right[i] = interleaved[i*2+1];
  }
}
