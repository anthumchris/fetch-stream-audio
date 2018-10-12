OPUS_DECODE_TEST_FILE_URL=https://fetch-stream-audio.anthum.com/audio/opus/decode-test-64kbps.opus
OPUS_DECODE_TEST_FILE=tmp/decode-test-64kbps.opus

NATIVE_OPUS_DIR=/usr/local/Cellar/opus/1.2.1
NATIVE_OPUSFILE_DIR=/usr/local/Cellar/opusfile/0.10
NATIVE_DECODER_TEST=tmp/opus_chunkdecoder_test

LIBOPUS_DIR=src/opus
LIBOPUS_CONFIGURE=$(LIBOPUS_DIR)/configure
LIBOPUS_MAKEFILE=$(LIBOPUS_DIR)/Makefile
LIBOPUS_LIB=$(LIBOPUS_DIR)/.libs/libopus.dylib

LIBOGG_DIR=src/ogg
LIBOGG_CONFIGURE=$(LIBOGG_DIR)/configure
LIBOGG_MAKEFILE=$(LIBOGG_DIR)/Makefile
LIBOGG_LIB=$(LIBOGG_DIR)/src/.libs/libogg.dylib

LIBOPUSFILE_DIR=src/opusfile
LIBOPUSFILE_CONFIGURE=$(LIBOPUSFILE_DIR)/configure
LIBOPUSFILE_MAKEFILE=$(LIBOPUSFILE_DIR)/Makefile
LIBOPUSFILE_LIB=$(LIBOPUSFILE_DIR)/.libs/libopusfile.dylib

WASM_MODULE_JS=dist/opus-stream-decoder.js

DEPS_CFLAGS = -I$(PWD)/$(LIBOGG_DIR)/include -I$(PWD)/$(LIBOPUS_DIR)/include
DEPS_LIBS = -L$(PWD)/$(LIBOGG_DIR)/src/.libs -L$(PWD)/$(LIBOPUS_DIR)/.libs -logg -lopus

default: build-dist

.PHONY: native-decode-test

build-dist: build-libopusfile $(WASM_MODULE_JS)
	@ cp src/test-opus-stream-decoder* dist

build-wasm-module:
build-libopusfile: build-libopus build-libogg $(LIBOPUSFILE_LIB)
build-libopus: $(LIBOPUS_LIB)
build-libogg: $(LIBOGG_LIB)

# Runs nodejs test with some audio files
test-wasm-module: build-dist $(OPUS_DECODE_TEST_FILE)
	@ mkdir -p tmp
	@ echo "Testing 64 kbps Opus file..."
	@ node dist/test-opus-stream-decoder.js $(OPUS_DECODE_TEST_FILE) tmp

$(OPUS_DECODE_TEST_FILE):
	@ mkdir -p tmp
	@ echo "Downloading decode test file $(OPUS_DECODE_TEST_FILE_URL)..."
	@ wget -q --show-progress $(OPUS_DECODE_TEST_FILE_URL) -O $(OPUS_DECODE_TEST_FILE)


clean: clean-dist
	@ echo "Run make clean-all to clean compiled C libraries if needed"

clean-all: clean-libopusfile clean-libopus clean-libogg clean-dist
	rm -rf tmp

clean-libopusfile:
	-cd $(LIBOPUSFILE_DIR); make clean 2>/dev/null; true
	rm -rf $(LIBOPUSFILE_LIB)
	rm -rf $(LIBOPUSFILE_MAKEFILE)
	rm -rf $(LIBOPUSFILE_CONFIGURE)
clean-libopus:
	-cd $(LIBOPUS_DIR);     make clean 2>/dev/null; true
	rm -rf $(LIBOPUS_LIB)
	rm -rf $(LIBOPUS_MAKEFILE)
	rm -rf $(LIBOPUS_CONFIGURE)
clean-libogg:
	-cd $(LIBOGG_DIR);      make clean 2>/dev/null; true
	rm -rf $(LIBOGG_LIB)
	rm -rf $(LIBOGG_MAKEFILE)
	rm -rf $(LIBOGG_CONFIGURE)
clean-dist:
	@ echo "Removing dist/ folder..."
	@ rm -rf dist

$(WASM_MODULE_JS):
	@ mkdir -p dist
	@ echo "Building Emscripten WebAssembly module ${WASM_MODULE_JS}..."

# Add emcc -g3 flag to produce .wast file for debugging.  Removes -O2 optimizations and produces larger files
# -O3 provides no marginal benefit over -O2 and takes longer to compile
	@ emcc \
		-o "$(WASM_MODULE_JS)" \
		-O3 \
		--llvm-lto 1 \
		-s WASM=1 \
		-s NO_DYNAMIC_EXECUTION=1 \
		-s NO_FILESYSTEM=1 \
		-s EXTRA_EXPORTED_RUNTIME_METHODS="['cwrap']" \
		-s EXPORTED_FUNCTIONS="[ \
				'_free', '_malloc' \
			, '_opus_get_version_string' \
			, '_opus_chunkdecoder_version' \
			, '_opus_chunkdecoder_create' \
			, '_opus_chunkdecoder_free' \
			, '_opus_chunkdecoder_enqueue' \
			, '_opus_chunkdecoder_decode_float_stereo_deinterleaved' \
		]" \
		--post-js 'src/emscripten-post.js' \
		-I "$(LIBOPUS_DIR)/include" \
		-I "$(LIBOGG_DIR)/include" \
		-I "$(LIBOPUSFILE_DIR)/include" \
		"$(LIBOPUS_LIB)" \
		"$(LIBOGG_LIB)" \
		"$(LIBOPUSFILE_LIB)" \
		src/opus_chunkdecoder.c

	@ echo "Successfully built WASM module: $(WASM_MODULE_JS)"


$(LIBOPUSFILE_LIB): $(LIBOPUSFILE_MAKEFILE)
	cd $(LIBOPUSFILE_DIR); emmake make
$(LIBOPUSFILE_MAKEFILE): $(LIBOPUSFILE_CONFIGURE)
	cd $(LIBOPUSFILE_DIR); \
	export DEPS_CFLAGS="$(DEPS_CFLAGS)" DEPS_LIBS="$(DEPS_LIBS)"; \
	emconfigure ./configure --disable-http --disable-doc --disable-examples --disable-largefile CFLAGS='-O2'
	# Remove a.out* files created by emconfigure
	cd $(LIBOPUSFILE_DIR); rm a.out*
$(LIBOPUSFILE_CONFIGURE):
	cd $(LIBOPUSFILE_DIR); ./autogen.sh


$(LIBOPUS_LIB): $(LIBOPUS_MAKEFILE)
	cd $(LIBOPUS_DIR); emmake make
$(LIBOPUS_MAKEFILE): $(LIBOPUS_CONFIGURE)
	cd $(LIBOPUS_DIR); emconfigure ./configure --disable-doc --disable-extra-programs --disable-intrinsics --disable-rtcd CFLAGS='-O2'
	# Remove a.out* files created by emconfigure
	cd $(LIBOPUS_DIR); rm a.out*
$(LIBOPUS_CONFIGURE):
	cd $(LIBOPUS_DIR); ./autogen.sh


$(LIBOGG_LIB): $(LIBOGG_MAKEFILE)
	cd $(LIBOGG_DIR); emmake make
$(LIBOGG_MAKEFILE): $(LIBOGG_CONFIGURE)
	cd $(LIBOGG_DIR); emconfigure ./configure
	# Remove a.out* files created by emconfigure
	cd $(LIBOGG_DIR); rm a.out*
$(LIBOGG_CONFIGURE):
	cd $(LIBOGG_DIR); ./autogen.sh


native-decode-test:
# ** For development only **
#
# This target is used to test the opus decoding functionality independent
# of WebAssembly.  It's a fast workflow to test the decoding/deinterlacing of
# an .opus file and ensure that things work natively before we try integrating
# it into Wasm.  libopus and libopusfile must be installed natively on your
# system. If you're on a Mac, you can install with "brew install opusfile"
#
# The test program outputs 3 files:
#   - *.wav stereo wav file
#   - *left.pcm raw PCM file of left channel
#   - *right.pcm raw PCM file of right channel
#
# Raw left/right PCM files can be played from the command using SoX https://sox.sourceforge.io/
# "brew install sox" if you're on a Mac.  then play decoded *.pcm file:
#
#   $ play --type raw --rate 48000 --endian little --encoding floating-point --bits 32 --channels 1 [PCM_FILENAME]
#
	@ mkdir -p tmp
	@ clang \
		-o "$(NATIVE_DECODER_TEST)" \
		-I "$(NATIVE_OPUSFILE_DIR)/include/opus" \
		-I "$(NATIVE_OPUS_DIR)/include/opus" \
		"$(NATIVE_OPUSFILE_DIR)/lib/libopusfile.dylib" \
		src/*.c

	@ $(NATIVE_DECODER_TEST) tmp/decode-test-64kbps.opus
