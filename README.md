<img clear="both" align="left" width="200px" src="https://raw.githubusercontent.com/AnthumChris/fetch-stream-audio/master/favicon.ico" /><br>

# Demo

https://fetch-stream-audio.anthum.com/

<br><br>

# Background

This repo is **incomplete/in-progress** and will provide examples for programatically decoding audio in chunks with the new Fetch &amp; Streams APIs.  Traditionally, [`decodeAudioData()`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) is used for programmatic decoding but requires the complete file to be downloaded, and chunk-based decoding is not supported.  These Streams examples will show how to sidestep that limitation until the new Web Audio API version is released.

Development will occur in the following phases:

1. **WAV Streaming** &nbsp; ✅ *complete*<br>WAV files are streamed and decoded by a Web Worker.  Chunks are scheduled into a read buffer before sending to encoder to ensure decoder receives complete, decodable chunks.  JavaScript (not WebAssembly) is used for decoding.
1. **Opus Streaming** &nbsp; 😶 *incomplete*<br>WebAssembly [`opus-stream-decoder`](https://github.com/AnthumChris/opus-stream-decoder) will be used to decode [Opus](http://opus-codec.org/) files.  This would simulate a real-world use case of streaming compressed audio over the web.  (MP3 is old and outdated for those of us who grew up with WinPlay3.  Opus is the new gold standard).  [`opus-stream-decoder`](https://github.com/AnthumChris/opus-stream-decoder) is now production-ready but has not yet been integrated into this repo.

# Back-End Server

For all `/audio/*` URIs, an Nginx server is configured to intentionally throttle and limit download speeds to control response packet sizes for testing the decoding behavior (defined in [server.conf](.conf/nginx/server.conf)).  For example:

https://fetch-stream-audio.anthum.com/nolimit/opus/decode-test-64kbit.opus<br>
https://fetch-stream-audio.anthum.com/10mbps/opus/decode-test-64kbit.opus<br>
https://fetch-stream-audio.anthum.com/1.5mbps/opus/decode-test-64kbit.opus<br>
https://fetch-stream-audio.anthum.com/512kbps/opus/decode-test-64kbit.opus

<details>
<summary>All Throttled Endpoints</summary>

| Speed      | Example URL |
| ----------- | ----------- |
| 16 kbps | https://fetch-stream-audio.anthum.com/16kbps/opus/decode-test-64kbit.opus |
| 24 kbps | https://fetch-stream-audio.anthum.com/24kbps/opus/decode-test-64kbit.opus |
| 32 kbps | https://fetch-stream-audio.anthum.com/32kbps/opus/decode-test-64kbit.opus |
| 64 kbps | https://fetch-stream-audio.anthum.com/64kbps/opus/decode-test-64kbit.opus |
| 72 kbps | https://fetch-stream-audio.anthum.com/72kbps/opus/decode-test-64kbit.opus |
| 80 kbps | https://fetch-stream-audio.anthum.com/80kbps/opus/decode-test-64kbit.opus |
| 88 kbps | https://fetch-stream-audio.anthum.com/88kbps/opus/decode-test-64kbit.opus |
| 96 kbps | https://fetch-stream-audio.anthum.com/96kbps/opus/decode-test-64kbit.opus |
| 104 kbps | https://fetch-stream-audio.anthum.com/104kbps/opus/decode-test-64kbit.opus |
| 112 kbps | https://fetch-stream-audio.anthum.com/112kbps/opus/decode-test-64kbit.opus |
| 120 kbps | https://fetch-stream-audio.anthum.com/120kbps/opus/decode-test-64kbit.opus |
| 128 kbps | https://fetch-stream-audio.anthum.com/128kbps/opus/decode-test-64kbit.opus |
| 160 kbps | https://fetch-stream-audio.anthum.com/160kbps/opus/decode-test-64kbit.opus |
| 192 kbps | https://fetch-stream-audio.anthum.com/192kbps/opus/decode-test-64kbit.opus |
| 256 kbps | https://fetch-stream-audio.anthum.com/256kbps/opus/decode-test-64kbit.opus |
| 384 kbps | https://fetch-stream-audio.anthum.com/384kbps/opus/decode-test-64kbit.opus |
| 512 kbps | https://fetch-stream-audio.anthum.com/512kbps/opus/decode-test-64kbit.opus |
| 768 kbps | https://fetch-stream-audio.anthum.com/768kbps/opus/decode-test-64kbit.opus |
| 1 mbps | https://fetch-stream-audio.anthum.com/1mbps/opus/decode-test-64kbit.opus |
| 4 mbps | https://fetch-stream-audio.anthum.com/4mbps/opus/decode-test-64kbit.opus |
| 5 mbps | https://fetch-stream-audio.anthum.com/5mbps/opus/decode-test-64kbit.opus |
| 2 mbps | https://fetch-stream-audio.anthum.com/2mbps/opus/decode-test-64kbit.opus |
| 3 mbps | https://fetch-stream-audio.anthum.com/3mbps/opus/decode-test-64kbit.opus |
| 4 mbps | https://fetch-stream-audio.anthum.com/4mbps/opus/decode-test-64kbit.opus |
| 5 mbps | https://fetch-stream-audio.anthum.com/5mbps/opus/decode-test-64kbit.opus |
| 6 mbps | https://fetch-stream-audio.anthum.com/6mbps/opus/decode-test-64kbit.opus |
| 7 mbps | https://fetch-stream-audio.anthum.com/7mbps/opus/decode-test-64kbit.opus |
| 8 mbps | https://fetch-stream-audio.anthum.com/8mbps/opus/decode-test-64kbit.opus |
| 9 mbps | https://fetch-stream-audio.anthum.com/9mbps/opus/decode-test-64kbit.opus |
| 10 mbps | https://fetch-stream-audio.anthum.com/10mbps/opus/decode-test-64kbit.opus |
| nolimit | https://fetch-stream-audio.anthum.com/nolimit/opus/decode-test-64kbit.opus<br>https://fetch-stream-audio.anthum.com/audio/opus/decode-test-64kbit.opus |

</details>


# Acknowledgements

Thanks to [@bjornm](https://github.com/bjornm) for pointing me to [@mohayonao](https://github.com/mohayonao)'s WAV decoder: https://github.com/mohayonao/wav-decoder
