# Makefile for assets

PYTHON=python
SOX=sox
LAME=lame

AUDIOS=chachin.mp3 start.mp3 timeout.mp3 put.mp3 beep.mp3 buzz.mp3 village.mp3

all: $(AUDIOS)

clean:
	-$(RM) $(AUDIOS)

.SUFFIXES: .png .wav .mp3

.wav.mp3:
	$(SOX) $< -t wav - pad 0 0.5 | $(LAME) - $@
