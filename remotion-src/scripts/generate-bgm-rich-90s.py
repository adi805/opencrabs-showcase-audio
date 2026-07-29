#!/usr/bin/env python3
"""Generate 90s extended BGM for OpenCrabs Showcase v2 (info-rich version).
Reuses the retro chiptune style from generate-audio.py but extends to 90s.
Output: public/audio/bgm/bgm-rich.wav
"""
import numpy as np
import wave
import os

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'bgm')
os.makedirs(OUT, exist_ok=True)

def write_wav(path, data, sr=SR):
    data = np.clip(data, -1.0, 1.0)
    data = (data * 32767).astype(np.int16)
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(data.tobytes())
    print(f"  wrote {path} ({len(data)/sr:.2f}s)")

def square(freq, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return np.sign(np.sin(2 * np.pi * freq * t))

def saw(freq, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return 2 * (t * freq - np.floor(t * freq + 0.5))

def noise(dur, sr=SR):
    return np.random.uniform(-1, 1, int(dur * sr))

def env(data, attack=0.01, decay=0.05, sustain=0.7, release=0.1):
    n = len(data)
    sr = SR
    a = min(int(attack * sr), n)
    d = min(int(decay * sr), max(n - a, 0))
    r = min(int(release * sr), max(n - a - d, 0))
    e = np.ones(n)
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    if d > 0:
        e[a:a+d] = np.linspace(1, sustain, d)
    mid_end = n - r
    if a + d < mid_end:
        e[a+d:mid_end] = sustain
    if r > 0:
        e[mid_end:] = np.linspace(sustain, 0, r)
    return data * e

# --- BGM: 90s chiptune, C minor, 140 BPM (extended for info-rich showcase) ---
print("Generating extended BGM (90s)...")
bpm = 140
beat = 60.0 / bpm  # ~0.4286s
total = 90.0
t = np.arange(int(total * SR)) / SR
bgm = np.zeros_like(t)

# Bass line (square wave, 8-note pattern)
bass_notes = [65.41, 65.41, 77.78, 77.78, 87.31, 87.31, 98.00, 98.00]
for i, note in enumerate(bass_notes):
    start = int(i * beat * 2 * SR)
    end = min(start + int(beat * 2 * SR), len(t))
    if start < len(t):
        seg = square(note, (end - start) / SR)
        bgm[start:end] += env(seg, sustain=0.3) * 0.25

# Arpeggio (square wave, 6-note pattern)
arp_notes = [261.63, 311.13, 392.00, 523.25, 392.00, 311.13]
arp_idx = 0
for i in range(int(total / (beat / 2))):
    start = int(i * (beat / 2) * SR)
    end = min(start + int((beat / 2) * SR), len(t))
    if start < len(t):
        note = arp_notes[arp_idx % len(arp_notes)]
        seg = square(note, (end - start) / SR)
        bgm[start:end] += env(seg, sustain=0.15) * 0.12
        arp_idx += 1

# Melody (saw wave, 8-note hook, loops more in 90s)
melody_notes = [523.25, 0, 622.25, 523.25, 0, 392.00, 0, 466.16]
for cycle in range(int(total / (beat * 4 * 8)) + 1):
    for i, note in enumerate(melody_notes):
        if note == 0:
            continue
        start = int((cycle * len(melody_notes) + i) * beat * 4 * SR)
        end = min(start + int(beat * 3 * SR), len(t))
        if start < len(t):
            seg = saw(note, (end - start) / SR)
            bgm[start:end] += env(seg, sustain=0.4) * 0.10

# Hi-hat (noise, every beat)
for i in range(int(total / beat)):
    start = int(i * beat * SR)
    end = min(start + int(0.05 * SR), len(t))
    if start < len(t):
        seg = noise((end - start) / SR)
        bgm[start:end] += env(seg, sustain=0.0) * 0.08

# Normalize
bgm = bgm / (np.max(np.abs(bgm)) + 1e-9) * 0.85
write_wav(os.path.join(OUT, 'bgm-rich.wav'), bgm)
print(f"Done! bgm-rich.wav = {total}s, 140 BPM, C minor chiptune.")
