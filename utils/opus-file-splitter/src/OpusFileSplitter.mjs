import { OggPageHeader } from './OggPageHeader.mjs';

export class OpusFileSplitter {
  #bytes;
  #headerBytes;
  #audioPageBoundaries;

  constructor(buffer) {
    this.parseFile(buffer)
  }

  get audioPageBoundaries() {
    return this.#audioPageBoundaries;
  }

  // scans file and executes callback when a page is found. ({ pageHeader }) => 
  scanPages(buffer, cb) {
    // big-endian Ogg page markers. see https://tools.ietf.org/html/rfc3533#page-10
    const pageMarker = new DataView((new TextEncoder().encode('OggS')).buffer).getUint32();
    const opusIdHeaderMarker = new DataView(new TextEncoder().encode('OpusHead').buffer).getBigUint64();
    const opusCommentHeaderMarker = new DataView(new TextEncoder().encode('OpusTags').buffer).getBigUint64();

    const view = new DataView(buffer);
    const scanTo = buffer.byteLength-Uint32Array.BYTES_PER_ELEMENT;

    let idPageFound = false;
    let commentPageFound = false;

    for (let i=0; i<scanTo; i++) {
      if (pageMarker !== view.getUint32(i))
        continue;

      const pageHeader = new OggPageHeader(view, i);

      if (!idPageFound) {
        if (opusIdHeaderMarker === view.getBigUint64(i + pageHeader.headerSize)) {
          pageHeader.isIdPage = true;
          idPageFound = true;
        }
      } else if (!commentPageFound) {
        if (opusCommentHeaderMarker === view.getBigUint64(i + pageHeader.headerSize)) {
          pageHeader.isCommentPage = true;
          commentPageFound = true;
        }
      } else {
        pageHeader.isAudioPage = true;
      }

      // const { isIdPage, isCommentPage, isAudioPage, isFirstPage, isLastPage, pageSequence, granulePosition} = pageHeader;
      // console.log({
      //               id: Number(isIdPage), 
      //               comment: Number(isCommentPage),
      //               audio: Number(isAudioPage),
      //               first: Number(isFirstPage), 
      //               last: Number(isLastPage), 
      //               page: pageSequence, pos: granulePosition
      //             });

      // skip ahead to next page
      if (pageHeader.pageSize) {
        i+= pageHeader.pageSize-1; // offset for i++
      }

      cb.call(null, { pageHeader })
    }
  }

  parseFile(buffer) {
    const audioPages = [];

    this.scanPages(buffer, onPage);

    if (!audioPages.length) {
      throw Error('Invalid Ogg Opus file.  No audio pages found');
    }

    this.#bytes = new Uint8Array(buffer);
    this.#headerBytes = new Uint8Array(buffer, 0, audioPages[0]);
    this.#audioPageBoundaries = audioPages;

    function onPage({ pageHeader }) {
      if (pageHeader.isAudioPage) {
        audioPages.push(pageHeader.offset)
      }
    }
  }

  // slice Ogg Opus file by audio pages. Mimic prototype of ArrayBuffer.slice(start, end);
  sliceByPage(begin, end) {
    const boundaries = this.#audioPageBoundaries;
    const bytesStart = boundaries.hasOwnProperty(begin)? boundaries[begin] : this.#bytes.byteLength;
    const bytesEnd = boundaries.hasOwnProperty(end)? boundaries[end] : this.#bytes.byteLength;

    // create bytes with header size plus audio pages' size
    const bytes = new Uint8Array(bytesEnd - bytesStart + this.#headerBytes.byteLength);

    // add header and audio bytes
    bytes.set(this.#headerBytes, 0);
    bytes.set(this.#bytes.slice(bytesStart, bytesEnd), this.#headerBytes.byteLength);

    return bytes;
  }

  sliceByPercentage(begin, end) {}
  sliceByByte(begin, end) {}
}

