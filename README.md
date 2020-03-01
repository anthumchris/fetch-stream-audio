<img clear="both" align="left" width="200px" src="https://raw.githubusercontent.com/AnthumChris/fetch-stream-audio/1ef61f06d4a9210492cc475985e7c73904c0b110/src/favicon.ico" /><br>

# Demo

https://fetch-stream-audio.anthum.com/

<br><br>

# Background

This repo provides Web Audio API examples for programatically decoding audio in chunks with the new Fetch &amp; Streams APIs.  Traditionally, [`decodeAudioData()`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) is used for programmatic decoding but requires the complete file to be downloaded, and chunk-based decoding is not supported.  These Streams examples will show how to sidestep that limitation.  Media Source Extensions could also be used to play audio and that example may be integrated here one day.

The examples demonstrate:

1. **Opus Streaming** [`opus-stream-decoder`](https://github.com/AnthumChris/opus-stream-decoder) is used to decode an [Opus](http://opus-codec.org/) file in a Web Worker with WebAssembly.  This simulates a real-world use case of streaming compressed audio over the web with the Web Audio  API.  (MP3 is old and outdated for those of us who grew up with WinPlay3.  Opus is the new gold standard).  This example is ideal because it allows for small, high-quality files with Opus.
1. **WAV Streaming**  A WAV file is streamed and decoded by a Web Worker.  Chunks are scheduled into a read buffer before sending to encoder to ensure decoder receives complete, decodable chunks.  JavaScript (not WebAssembly) is used for decoding. This example requires a much larger file.

# Opus Playback Tests

Opus file playback can be tested at throttled download speeds and various encoding/bitrate qualities ([Issue #14](https://github.com/AnthumChris/fetch-stream-audio/issues/14) will add to UI):

[opusBitrate = 96; throttle = nolimit](https://fetch-stream-audio.anthum.com/#opusBitrate=96;throttle=nolimit)<br>
[opusBitrate = 96; throttle = 1mbps](https://fetch-stream-audio.anthum.com/#opusBitrate=96;throttle=1mbps)<br>
[opusBitrate = 96; throttle = 104kbps](https://fetch-stream-audio.anthum.com/#opusBitrate=96;throttle=104kbps)<br>
[opusBitrate = 96; throttle = 100kbps](https://fetch-stream-audio.anthum.com/#opusBitrate=96;throttle=100kbps)<br>
[opusBitrate = 64; throttle = 72kbps](https://fetch-stream-audio.anthum.com/#opusBitrate=64;throttle=72kbps)<br>
[opusBitrate = 60; throttle = 64kbps](https://fetch-stream-audio.anthum.com/#opusBitrate=60;throttle=64kbps)<br>
[opusBitrate = 32; throttle = 40kbps](https://fetch-stream-audio.anthum.com/#opusBitrate=32;throttle=40kbps)<br>
[opusBitrate = 28; throttle = 32kbps](https://fetch-stream-audio.anthum.com/#opusBitrate=28;throttle=32kbps)<br>
[opusBitrate = 12; throttle = 16kbps](https://fetch-stream-audio.anthum.com/#opusBitrate=12;throttle=16kbps)

# Back-End Nginx Server

To use the config files, create symblink `fetch-stream-audio`, e.g.:

```
$ ln -s [LOCATION_TO_THIS_REPO]/.conf/nginx /etc/nginx/fetch-stream-audio
```

Then, include this repo's nginx config file into your `server {}` block, e.g.:

```nginx
server {
  ...

  disable_symlinks off;
  include fetch-stream-audio/include-server.conf;
}
```

## Throttled Bandwidth Endpoints

All `/audio/*` URIs are configured to intentionally limit download speeds and control response packet sizes for testing the decoding behavior (defined in [server.conf](.conf/nginx/server.conf)).  For example:

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
| 100 kbps | https://fetch-stream-audio.anthum.com/100kbps/opus/decode-test-64kbit.opus |
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
