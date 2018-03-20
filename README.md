# Demo

https://fetch-stream-audio.anthum.com/

# Background

This repo is **incomplete/in-progress** and will provide examples for programatically decoding audio in chunks with the new Fetch &amp; Streams APIs.  Traditionally, [`decodeAudioData()`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) is used for programmatic decoding but requires the complete file to be downloaded, and chunk-based decoding is not supported.  These Streams examples will show how to sidestep that limitation until the new Web Audio API version is released.

Development will occur in the following phases:

1. **WAV Decoding - Proof of Concept** &nbsp; ✅ *complete*<br>Streaming local WAV files works as intended.  Remote files don't stream proplerly due to the chunks received that contain odd (not even) number of total bytes.
1. **WAV Decoding - Buffered Read** &nbsp; ✅ *complete*<br>Bytes read are scheduled into a read buffer to prevent failed chunk decoding resulting from incomplete chunks.
1. **WAV Decoding - Web Worker** &nbsp; 😶 *incomplete*<br>Decoding will be moved to a Web Worker
1. **Opus Decoding** &nbsp; 😶 *incomplete*<br>WebAssembly will be used to decode [Opus](http://opus-codec.org/) files.  This would simulate a real-world use case of streaming compressed audio over the web.  (MP3 is old and outdated for those of us who grew up with WinPlay3.  Opus is the new gold standard).  

# Back-End Server

For all `/audio/*` URIs, an Nginx server is configured to intentionally limit download speeds and control response packet sizes for testing the decoding behavior (defined in [server.conf](.conf/nginx/server.conf)).  For example:

https://fetch-stream-audio.anthum.com/nolimit/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/200kbps/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/192kbps/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/100kbps/rock-48000hz-trim.wav

# Acknowledgements

Thanks to [@bjornm](https://github.com/bjornm) for pointing me to [@mohayonao](https://github.com/mohayonao)'s WAV decoder: https://github.com/mohayonao/wav-decoder
