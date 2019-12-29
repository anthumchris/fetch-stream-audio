# this should be called from project root

set -e

mkdir -p dist

# Parcel doesn't copy .wasm.
cp node_modules/opus-stream-decoder/dist/opus-stream-decoder.wasm dist/

cd dist
ln -fs ../audio audio
cd ..

parcel --no-autoinstall src/index.html
