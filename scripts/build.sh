# this should be called from project root

set -e

parcel build \
  --experimental-scope-hoisting \
  --no-autoinstall \
  src/index.html

cd dist
ln -fs ../audio audio
