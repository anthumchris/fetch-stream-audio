# this should be called from project root

set -e

mkdir -p dist

# Parcel doesn't copy .wasm.
cp src/js/opus-stream-decoder/dist/opus-stream-decoder.cjs.wasm dist/

cd dist
ln -fs ../audio audio
cd ..

parcel --no-autoinstall src/index.html
