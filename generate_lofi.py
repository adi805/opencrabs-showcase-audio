#!/usr/bin/env python3
"""Lo-fi soundtrack generator for OpenCrabs showcase video.
80 BPM boom-bap, jazz chords (Dm9-G13-Cmaj7-Am7), vinyl crackle, Rhodes keys.
Synced to 10 slides x 6s with soft SFX at transitions.
"""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
import struct, os

SR = 44100
DURATION = 60.0
BPM = 80
BEAT = 60.0 / BPM  # 0.75s
BAR = BEAT * 4      # 3.0s
N = int(SR * DURATION)
t = np.arange(N) / SR

# Transition times (from scene detection)
TRANSITIONS = [5.5, 11.5, 17.5, 23.5, 29.5, 35.5, 41.5, 47.5, 53.5]

def note_freq(name):
    notes = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
    n = notes[name[0]]
    if len(name) > 2 and name[1] == '#': n += 1
    if len(name) > 2 and name[1] == 'b': n -= 1
    octave = int(name[-1])
    return 440.0 * (2.0 ** ((n - 9 + 12 * (octave - 4)) / 12.0))

def lowpass(data, cutoff, order=4):
    nyq = SR / 2.0
    b, a = butter(order, cutoff / nyq, btype='low')
    return lfilter(b, a, data)

def soft_clip(x, threshold=0.8):
    return np.tanh(x / threshold) * threshold

def env_adsr(length, a=0.01, d=0.05, s=0.7, r=0.1):
    n = int(length * SR)
    e = np.ones(n)
    a_n = int(a * SR)
    d_n = int(d * SR)
    r_n = int(r * SR)
    if a_n > 0: e[:a_n] = np.linspace(0, 1, a_n)
    if d_n > 0: e[a_n:a_n+d_n] = np.linspace(1, s, d_n)
    if r_n > 0: e[-r_n:] = np.linspace(s, 0, r_n)
    s_end = n - r_n
    if a_n + d_n < s_end: e[a_n+d_n:s_end] = s
    return e

def env_perc(length, decay=0.3):
    n = int(length * SR)
    return np.exp(-np.linspace(0, decay * 20, n))

# === CHORD PROGRESSION (jazz voicings) ===
# Dm9 - G13 - Cmaj7 - Am7 (ii-V-I-vi in C major)
CHORDS = [
    [note_freq('D3'), note_freq('F3'), note_freq('A3'), note_freq('C4'), note_freq('E4')],  # Dm9
    [note_freq('G2'), note_freq('B2'), note_freq('D3'), note_freq('F3'), note_freq('A3')],  # G13
    [note_freq('C3'), note_freq('E3'), note_freq('G3'), note_freq('B3')],                    # Cmaj7
    [note_freq('A2'), note_freq('C3'), note_freq('E3'), note_freq('G3')],                    # Am7
]
BASS_NOTES = [note_freq('D2'), note_freq('G1'), note_freq('C2'), note_freq('A1')]

# Each chord = 2 bars = 6 seconds = 1 slide
def get_chord_idx(time_s):
    slide = int(time_s / 6.0)
    return slide % 4

# === DRUMS (boom-bap with swing) ===
drums = np.zeros(N)
SWING = 0.62  # swing ratio for 8th notes

# Kick pattern: beats 1 and 3 (with ghost on 2.5)
# Snare: beats 2 and 4
# Hi-hat: swung 8th notes
for bar_start_i in range(int(DURATION / BAR)):
    bar_t = bar_start_i * BAR
    
    # Kick on beat 1 and 3
    for beat_offset in [0, 2 * BEAT]:
        pos = int((bar_t + beat_offset) * SR)
        if pos < N:
            length = int(0.15 * SR)
            kick_t = np.arange(length) / SR
            # Pitch envelope: 120Hz -> 45Hz
            freq_env = 45 + 75 * np.exp(-kick_t * 30)
            kick = np.sin(2 * np.pi * np.cumsum(freq_env) / SR) * env_perc(0.15, 0.5)
            end = min(pos + length, N)
            drums[pos:end] += kick[:end-pos] * 0.45
    
    # Ghost kick on beat 2.5 (very soft)
    pos = int((bar_t + 2.5 * BEAT) * SR)
    if pos < N:
        length = int(0.08 * SR)
        kick_t = np.arange(length) / SR
        freq_env = 45 + 60 * np.exp(-kick_t * 35)
        kick = np.sin(2 * np.pi * np.cumsum(freq_env) / SR) * env_perc(0.08, 0.6)
        end = min(pos + length, N)
        drums[pos:end] += kick[:end-pos] * 0.12
    
    # Snare on beats 2 and 4
    for beat_offset in [BEAT, 3 * BEAT]:
        pos = int((bar_t + beat_offset) * SR)
        if pos < N:
            length = int(0.12 * SR)
            noise = np.random.randn(length) * env_perc(0.12, 0.4)
            # Bandpass the noise for snare character
            snare_body = np.sin(2 * np.pi * 185 * np.arange(length) / SR) * env_perc(0.12, 0.5)
            snare = noise * 0.25 + snare_body * 0.15
            end = min(pos + length, N)
            drums[pos:end] += snare[:end-pos]
    
    # Hi-hat: swung 8th notes
    for eighth_i in range(8):
        if eighth_i % 2 == 0:
            hat_t = bar_t + (eighth_i // 2) * BEAT
        else:
            hat_t = bar_t + (eighth_i // 2) * BEAT + BEAT * SWING
        
        pos = int(hat_t * SR)
        if pos < N:
            length = int(0.04 * SR)
            noise = np.random.randn(length) * env_perc(0.04, 0.8)
            # High-pass for hat
            hat = noise * (0.08 if eighth_i % 2 == 0 else 0.05)
            end = min(pos + length, N)
            drums[pos:end] += hat[:end-pos]

# === BASS (smooth triangle, follows root) ===
bass = np.zeros(N)
for i in range(N):
    ci = get_chord_idx(t[i])
    freq = BASS_NOTES[ci]
    # Simple 8th note pattern with rests
    beat_pos = (t[i] % BEAT) / BEAT
    bar_pos = (t[i] % BAR) / BAR
    # Play on beats 1, 1.5, 3 (classic lo-fi bass pattern)
    play = False
    amp = 0.3
    if beat_pos < 0.4:
        beat_in_bar = int((t[i] % BAR) / BEAT)
        if beat_in_bar in [0, 2]:
            play = True
        elif beat_in_bar == 1 and beat_pos < 0.2:
            play = True
            amp = 0.15
    if play:
        # Triangle wave
        phase = (t[i] * freq) % 1.0
        tri = 2.0 * np.abs(2.0 * phase - 1.0) - 1.0
        bass[i] = tri * amp

# Soften bass
bass = lowpass(bass, 250, 2)

# === RHODES KEYS (soft sine + detune + tremolo) ===
keys = np.zeros(N)
for i in range(N):
    ci = get_chord_idx(t[i])
    chord = CHORDS[ci]
    val = 0.0
    for j, freq in enumerate(chord):
        # Slight detune per note for warmth
        detune = 1.0 + (j - len(chord)/2) * 0.001
        f = freq * detune
        # Sine + soft 2nd harmonic
        val += np.sin(2 * np.pi * f * t[i]) * 0.12
        val += np.sin(2 * np.pi * f * 2 * t[i]) * 0.03
    # Tremolo (slow amplitude modulation, classic Rhodes)
    tremolo = 0.7 + 0.3 * np.sin(2 * np.pi * 4.5 * t[i])
    keys[i] = val * tremolo

# Soft attack/release per chord change
for slide_i in range(10):
    start = int(slide_i * 6.0 * SR)
    end = min(int((slide_i * 6.0 + 6.0) * SR), N)
    fade_in = min(int(0.3 * SR), end - start)
    fade_out = min(int(0.5 * SR), end - start)
    if fade_in > 0:
        keys[start:start+fade_in] *= np.linspace(0, 1, fade_in)
    if fade_out > 0:
        keys[end-fade_out:end] *= np.linspace(1, 0, fade_out)

keys = lowpass(keys, 3500, 2)

# === MELODY (sparse pentatonic, soft) ===
melody = np.zeros(N)
# C major pentatonic: C D E G A
PENTA = [note_freq('C5'), note_freq('D5'), note_freq('E5'), note_freq('G5'), note_freq('A5')]
# Simple melody pattern - one note per bar, sparse
melody_pattern = [0, 2, 4, 3, 1, 4, 2, 0, 3, 1]  # indices into PENTA
for bar_i in range(int(DURATION / BAR)):
    note_idx = melody_pattern[bar_i % len(melody_pattern)]
    freq = PENTA[note_idx]
    # Play at beat 1 of each bar, short and soft
    pos = int(bar_i * BAR * SR) + int(0.5 * BEAT * SR)  # slightly after beat 1
    length = int(1.2 * BEAT * SR)
    if pos + length < N:
        mel_t = np.arange(length) / SR
        # Soft bell-like tone
        tone = np.sin(2 * np.pi * freq * mel_t) * 0.08
        tone += np.sin(2 * np.pi * freq * 2 * mel_t) * 0.02
        tone *= env_adsr(length / SR, a=0.02, d=0.1, s=0.4, r=0.4)
        melody[pos:pos+length] += tone

melody = lowpass(melody, 5000, 2)

# === VINYL CRACKLE ===
crackle = np.zeros(N)
# Random pops and hiss
hiss = np.random.randn(N) * 0.008
hiss = lowpass(hiss, 6000, 2)
# Random pops (sparse impulses)
n_pops = int(DURATION * 3)  # ~3 pops per second
pop_positions = np.random.randint(0, N, n_pops)
for p in pop_positions:
    amp = np.random.uniform(0.01, 0.04)
    length = np.random.randint(5, 30)
    end = min(p + length, N)
    crackle[p:end] += np.random.randn(end - p) * amp * np.exp(-np.linspace(0, 5, end - p))

vinyl = hiss + crackle
# Wow and flutter (subtle pitch modulation on the whole mix later)

# === SFX (soft, lo-fi appropriate) ===
sfx = np.zeros(N)

for tr_time in TRANSITIONS:
    # Soft whoosh (filtered noise sweep, gentler than synthwave)
    whoosh_dur = 0.6
    whoosh_start = int((tr_time - 0.3) * SR)
    whoosh_len = int(whoosh_dur * SR)
    if whoosh_start >= 0 and whoosh_start + whoosh_len < N:
        noise = np.random.randn(whoosh_len)
        # Sweep bandpass center from 300 to 2000 Hz
        # Approximate with amplitude envelope
        env = np.sin(np.linspace(0, np.pi, whoosh_len)) * 0.08
        whoosh = noise * env
        whoosh = lowpass(whoosh, 2500, 2)
        sfx[whoosh_start:whoosh_start+whoosh_len] += whoosh
    
    # Soft chime (instead of hard impact)
    chime_pos = int(tr_time * SR)
    chime_len = int(0.8 * SR)
    if chime_pos + chime_len < N:
        chime_t = np.arange(chime_len) / SR
        # Two soft sine tones (perfect fifth)
        chime = np.sin(2 * np.pi * 523.25 * chime_t) * 0.06  # C5
        chime += np.sin(2 * np.pi * 783.99 * chime_t) * 0.03  # G5
        chime *= env_perc(0.8, 0.3)
        sfx[chime_pos:chime_pos+chime_len] += chime

# Soft UI blips at slide content appearance (1s after each transition)
for tr_time in TRANSITIONS:
    blip_time = tr_time + 1.0
    blip_pos = int(blip_time * SR)
    blip_len = int(0.06 * SR)
    if blip_pos + blip_len < N:
        blip_t = np.arange(blip_len) / SR
        blip = np.sin(2 * np.pi * 880 * blip_t) * 0.04
        blip *= env_perc(0.06, 0.5)
        sfx[blip_pos:blip_pos+blip_len] += blip

# === INTRO BUILD (0-5.5s) ===
# Gentle fade-in of vinyl + soft pad
intro_fade = np.ones(N)
intro_end = int(5.5 * SR)
intro_fade[:intro_end] = np.linspace(0.2, 1.0, intro_end)

# === OUTRO FADE (53.5-60s) ===
outro_start = int(53.5 * SR)
outro_fade = np.ones(N)
outro_fade[outro_start:] = np.linspace(1.0, 0.0, N - outro_start)

# === MIX ===
# Lo-fi character: low-pass everything, add vinyl, slight saturation
mix = np.zeros(N)
mix += drums * 0.7
mix += bass * 0.65
mix += keys * 0.55
mix += melody * 0.4
mix += vinyl * 1.0
mix += sfx * 0.8

# Apply intro/outro fades
mix *= intro_fade
mix *= outro_fade

# Global low-pass for lo-fi warmth (cut above 8kHz)
mix = lowpass(mix, 8000, 2)

# Gentle saturation
mix = soft_clip(mix, 0.85)

# Normalize to -1 dB
peak = np.max(np.abs(mix))
if peak > 0:
    target = 10 ** (-1.0 / 20.0)  # -1 dB
    mix = mix / peak * target

# Convert to 16-bit stereo
mix_16 = np.clip(mix * 32767, -32768, 32767).astype(np.int16)
stereo = np.column_stack([mix_16, mix_16])

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'soundtrack-lofi.wav')
wavfile.write(out_path, SR, stereo)
print(f"Lo-fi soundtrack written: {out_path}")
print(f"Size: {os.path.getsize(out_path) / 1024 / 1024:.1f} MB")
print(f"Duration: {DURATION}s, BPM: {BPM}, SR: {SR}")
