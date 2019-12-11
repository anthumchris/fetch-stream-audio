// This file may need to be run with NodeJS flag --experimental-modules until ES Modules are fully supported

import { OpusFileSplitter } from '../src/OpusFileSplitter.mjs';;
import fs from 'fs';

console.clear();

const fileName = 'test/audio-32kbit.opus';
const file = fs.readFileSync(fileName);
const splitter = new OpusFileSplitter(file.buffer)

console.assert(
  splitter.audioPageBoundaries.toString() === 
    [841,  5935, 10181, 14354, 18934, 23173, 27137].toString(),
  'audio page boundaries'
);

// split a 7-page test file into mutliple out files
const outFiles = [
  ['test/_split-1.opus', 10181, 0,2],
  ['test/_split-2.opus', 9594, 2,4],
  ['test/_split-3.opus', 9044, 4,6],
  ['test/_split-4.opus', 1710, 6,7],
  ['test/_split-5.opus', 841, 7],
]

outFiles.forEach(([ fileName, expectedByteLength, ...indexes ]) => {
  const splitBytes = splitter.sliceByPage.call(splitter, ...indexes);
  console.assert(splitBytes.byteLength === expectedByteLength, `split byte size ${fileName}`)
  fs.writeFileSync(fileName, splitBytes);
});

console.log('Tests done!');