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

For all `/audio/*` URIs, an Nginx server is configured to intentionally limit download speeds and control response packet sizes for testing the decoding behavior (defined in [server.conf](.conf/nginx/server.conf)).  For example:

https://fetch-stream-audio.anthum.com/nolimit/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/200kbps/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/192kbps/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/100kbps/rock-48000hz-trim.wav

# Acknowledgements

Thanks to [@bjornm](https://github.com/bjornm) for pointing me to [@mohayonao](https://github.com/mohayonao)'s WAV decoder: https://github.com/mohayonao/wav-decoder
