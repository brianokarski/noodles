"""
Slower vibraphone version with hall reverb.
Tweak HERE to dial it in.
"""
import numpy as np
import wave
import os

SAMPLE_RATE = 44100

# -- DIAL IT IN -------------------------------------------------------------
# Reverb settings
REVERB_DECAY_SECONDS = 3.0   # how long the reverb tail lasts (1.5 = small room, 4.0 = cathedral)
REVERB_PREDELAY_MS = 25      # gap between dry signal and reverb start
WET_DRY_MIX = 0.45           # 0.0 = fully dry, 1.0 = fully wet. 0.4–0.5 is hall-like.

# Pacing — higher = slower
SWEEP_NOTE_SPACING = 0.12    # seconds between sweep notes (was 0.06)
CHORD_HOLD_DURATION = 4.0    # how long the final chord rings (was 2.0)
TOTAL_DURATION = 7.0         # render this long total to capture all reverb tail
# ---------------------------------------------------------------------------


def midi_to_freq(midi):
    return 440.0 * (2 ** ((midi - 69) / 12))


def envelope(length, attack=0.005, decay=1.4):
    t = np.linspace(0, length / SAMPLE_RATE, length, endpoint=False)
    env = np.exp(-decay * t)
    attack_samples = int(attack * SAMPLE_RATE)
    if attack_samples > 0:
        env[:attack_samples] *= np.linspace(0, 1, attack_samples)
    return env


def vibraphone_note(freq, duration=2.5, tremolo_rate=5.5):
    """Warm metallic mallet with vibrato/tremolo."""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, endpoint=False)
    wave_data = (
        1.00 * np.sin(2 * np.pi * freq * t)
        + 0.45 * np.sin(2 * np.pi * freq * 3 * t)
        + 0.20 * np.sin(2 * np.pi * freq * 5 * t)
    )
    tremolo = 0.7 + 0.3 * np.sin(2 * np.pi * tremolo_rate * t)
    env = envelope(samples, attack=0.005, decay=1.0)  # slower decay than the bouncy version
    return wave_data * env * tremolo


def render_dry():
    """Render the slow vibraphone sweep + sustained chord (no reverb yet)."""
    output = np.zeros(int(SAMPLE_RATE * TOTAL_DURATION))

    def add_note(midi, start_s, dur, vel):
        start_idx = int(start_s * SAMPLE_RATE)
        note = vibraphone_note(midi_to_freq(midi), dur) * vel
        end_idx = min(start_idx + len(note), len(output))
        output[start_idx:end_idx] += note[: end_idx - start_idx]

    # Slower ascending C-major scale sweep
    sweep_pitches = [60, 62, 64, 65, 67, 69, 71, 72]  # C4 → C5
    for i, p in enumerate(sweep_pitches):
        add_note(p, i * SWEEP_NOTE_SPACING, 0.6, 0.55)

    # Final sustained Cmaj6 chord (C5-E5-G5-A5)
    chord_start = len(sweep_pitches) * SWEEP_NOTE_SPACING + 0.05
    for midi, vel in [(72, 1.0), (76, 0.85), (79, 0.7), (81, 0.55)]:
        add_note(midi, chord_start, CHORD_HOLD_DURATION, vel)

    return output


def make_impulse_response(decay_seconds, predelay_ms):
    """Synthetic hall reverb IR: predelay + exponentially decaying filtered noise."""
    predelay_samples = int(predelay_ms / 1000 * SAMPLE_RATE)
    tail_samples = int(decay_seconds * SAMPLE_RATE)
    total = predelay_samples + tail_samples

    ir = np.zeros(total)

    # Tail = decaying noise, low-pass filtered for warmth
    tail = np.random.uniform(-1, 1, tail_samples)
    # Simple 1-pole low-pass (smooth out high-freq harshness)
    smoothed = np.zeros_like(tail)
    alpha = 0.4  # higher = brighter tail
    for i in range(1, len(tail)):
        smoothed[i] = alpha * tail[i] + (1 - alpha) * smoothed[i - 1]
    # Exponential decay envelope on the tail
    t = np.linspace(0, decay_seconds, tail_samples, endpoint=False)
    decay_env = np.exp(-3.0 * t / decay_seconds)
    smoothed *= decay_env

    # Place tail after predelay
    ir[predelay_samples:] = smoothed

    # Boost the very first impulse for direct sound
    ir[0] = 1.0

    # Normalize so the IR has unity-ish energy
    ir = ir / np.max(np.abs(ir))
    return ir


def apply_reverb(dry, ir, wet_dry_mix):
    """Convolve dry signal with IR, mix wet/dry."""
    wet = np.convolve(dry, ir, mode="full")[: len(dry)]
    # Normalize wet so it doesn't blow up
    wet = wet / np.max(np.abs(wet)) * np.max(np.abs(dry))
    return (1 - wet_dry_mix) * dry + wet_dry_mix * wet


def normalize_and_save(audio, path, peak=0.85):
    audio = audio / np.max(np.abs(audio)) * peak
    audio_int = (audio * 32767).astype(np.int16)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_int.tobytes())
    print(f"Wrote {path}")
    print(
        f"  Reverb: decay={REVERB_DECAY_SECONDS}s, predelay={REVERB_PREDELAY_MS}ms, "
        f"wet/dry={WET_DRY_MIX}, sweep_pace={SWEEP_NOTE_SPACING}s"
    )


def main():
    print("Rendering dry vibraphone...")
    dry = render_dry()

    print("Building impulse response...")
    ir = make_impulse_response(REVERB_DECAY_SECONDS, REVERB_PREDELAY_MS)

    print("Applying reverb...")
    wet = apply_reverb(dry, ir, WET_DRY_MIX)

    out_path = os.path.join(os.path.dirname(__file__), "sounds", "katamari_vibraphone_slow.wav")
    normalize_and_save(wet, out_path)
    print("\nAudition:")
    print(f"  afplay {out_path}")
    print("\nIf you want to tweak: edit the DIAL IT IN constants at the top of this file and re-run.")


if __name__ == "__main__":
    main()
