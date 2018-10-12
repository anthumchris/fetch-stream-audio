# Demo

https://fetch-stream-audio.anthum.com/

# Background

This repo is **incomplete/in-progress** and will provide examples for programatically decoding audio in chunks with the new Fetch &amp; Streams APIs.  Traditionally, [`decodeAudioData()`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) is used for programmatic decoding but requires the complete file to be downloaded, and chunk-based decoding is not supported.  These Streams examples will show how to sidestep that limitation until the new Web Audio API version is released.

Development will occur in the following phases:

1. **WAV Streaming** &nbsp; ✅ *complete*<br>WAV files are streamed and decoded by a Web Worker.  Chunks are scheduled into a read boffer before sending to encoder to ensure decoder receives complete, decodable chunks.  JavaScript (not WebAssembly) is used for decoding.
1. **Opus Streaming** &nbsp; 😶 *incomplete*<br>WebAssembly will be used to decode [Opus](http://opus-codec.org/) files.  This would simulate a real-world use case of streaming compressed audio over the web.  (MP3 is old and outdated for those of us who grew up with WinPlay3.  Opus is the new gold standard).

# Building `OpusStreamDecoder` WebAssembly Module

The `dist/` folder will contain all required files to use and test `OpusStreamDecoder`

### Download source for Ogg, Opus, and Opusfile C libraries:
```
$ git submodule init
$ git submodule update
```
### Install Emscripten

Emscripten is used to compile the C libraries to be compatible with WebAssembly.  This repo was tested with 1.37.35.

[Emscripten Installation Instructions](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#installation-instructions)

### Run the Build

Most of the work and time will be spent compiling the `libopusfile` C library and its dependencies `libopus` and `libogg`.  After those are built, the `OpusStreamDecoder` Emscripten Module builds in a few seconds.
```
$ make
```

### Test `OpusStreamDecoder`

Two tests exist that will decode an OggOpusFile with `OpusStreamDecoder`.  Both tests should output "Decoded X samples." on success.

#### NodeJS Test & Example

This test writes decoded left/right PCM audio data to files. [Install NodeJS](https://nodejs.org/en/download/) and run:
```
$ make test-wasm-module
```

#### HTML Browser Test & Example

This text uses `fetch()` to decode a file stream in chunks.  Serve the `dist/` folder from a web server and open `test-opus-stream-decoder.html` in the browser.  Http or Https schemes are required for Wasm to load, and opening it directly with `file://` probably won't work.

You can also run `SimpleHTTPServer` and navigate to http://localhost:8000/test-opus-stream-decoder.html
```
$ cd dist
$ python -m SimpleHTTPServer 8000
```

# Back-End Server

For all `/audio/*` URIs, an Nginx server is configured to intentionally limit download speeds and control response packet sizes for testing the decoding behavior (defined in [server.conf](.conf/nginx/server.conf)).  For example:

https://fetch-stream-audio.anthum.com/nolimit/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/200kbps/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/192kbps/rock-48000hz-trim.wav<br>
https://fetch-stream-audio.anthum.com/100kbps/rock-48000hz-trim.wav

# Acknowledgements

Thanks to [@bjornm](https://github.com/bjornm) for pointing me to [@mohayonao](https://github.com/mohayonao)'s WAV decoder: https://github.com/mohayonao/wav-decoder
