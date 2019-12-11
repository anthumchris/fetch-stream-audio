
# Ogg Opus File Splitter

This utility splits an Ogg Opus file into smaller Opus files.

### Current Limitations

1. One logical bitstream is supported.  Multiplexed files are not supported.
1. One comment header page is supported (the spec allows for more).
1. Audio packets cannot span across multiple pages.

# Example

#### Source Opus File
<img width="800" src="https://user-images.githubusercontent.com/10064176/70798813-f068ca80-1d75-11ea-9ac1-db8258280ff5.png" />

#### JavaScript

```js
import { OpusFileSplitter } from './OpusFileSplitter.mjs';

fetch('https://example.com/audio.opus')
.then(response => response.arrayBuffer())
.then(arrayBuffer => {
  const opusFile = new OpusFileSplitter(arrayBuffer);
  const totalPages = opusFile.totalAudioPages;   // 5
  const firstHalf = opusFile.sliceByPage(0, 3);  // pages 0, 1, 2
  const secondHalf = opusFile.sliceByPage(3);    // pages 3, 4
})
```
## Explaination

Two `Uint8Array` objects are created by combining the first header pages with the specified audio pages.  The `slice()` function behaves similar to [`ArrayBuffer.slice(begin[, end])`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/slice) regarding the inclusive/exclusive nature of the parameters.  The resulting `Uint8Array` objects look like this:

#### sliceByPage(0, 3)
<img width="560" src="https://user-images.githubusercontent.com/10064176/70800189-9cf87b80-1d79-11ea-9d2b-ea038b8e5f06.png">

#### sliceByPage(3)
<img width="440" src="https://user-images.githubusercontent.com/10064176/70800373-17290000-1d7a-11ea-9a25-090d63967f72.png">
