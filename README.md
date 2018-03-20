This repo is **incomplete/in-progress** and will provide examples for streaming audio with the new Fetch &amp; Streams APIs.

Development will occur in the following phases:

1. **WAV Decoding - Proof of Concept** &nbsp; ✅ *complete*<br>Streaming local WAV files works as intended.  Remote files don't stream proplerly due to the chunks received that contain odd (not even) number of total bytes.
1. **WAV Decoding - Buffered Read** &nbsp; ✅ *complete*<br>Bytes read are scheduled into a read buffer to prevent failed chunk decoding resulting from incomplete chunks.
1. **WAV Decoding - Web Worker** &nbsp; 😶 *incomplete*<br>Decoding will be moved to a Web Worker
1. **Opus Decoding** &nbsp; 😶 *incomplete*<br>WebAssembly will be used to decode [Opus](http://opus-codec.org/) files.  (MP3 is outdated).  This would simulate a real-world use case of streaming compressed audio over the web.

# Acknowledgements

Thanks to [@mohayonao](https://github.com/mohayonao) for the WAV decoder: https://github.com/mohayonao/wav-decoder