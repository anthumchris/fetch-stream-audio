# this should be called from project root

set -e

mkdir -p dist

# Parcel doesn't copy .wasm or images
cp node_modules/opus-stream-decoder/dist/opus-stream-decoder.wasm dist/
cp -r src/images dist

cd dist
ln -fs ../audio audio
cd ..

parcel build \
  --experimental-scope-hoisting \
  --no-autoinstall \
  src/index.html
