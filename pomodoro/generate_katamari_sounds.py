"""
Generate Katamari-style completion sounds.

Produces 4 WAV files in sounds/:
  katamari_marimba.wav    — warm woody ascending bounce
  katamari_glockenspiel.wav — bright ding-ding-ding chime
  katamari_toypiano.wav   — playful detuned arpeggio
  katamari_vibraphone.wav — swooping mallet sweep to chord

After generating, audition with:
  afplay sounds/katamari_marimba.wav
  afplay sounds/katamari_glockenspiel.wav
  ...etc

Pick your favorite, then:
  cp sounds/katamari_<choice>.wav sounds/piano.wav
"""
import numpy as np
import wave
import os

SAMPLE_RATE = 44100


def midi_to_freq(midi):
    return 440.0 * (2 ** ((midi - 69) / 12))


def envelope_adsr(length, attack=0.005, decay=2.5, sustain_level=0.0):
    """Generate an exponential decay envelope with quick attack."""
    t = np.linspace(0, length / SAMPLE_RATE, length, endpoint=False)
    env = np.exp(-decay * t)
    attack_samples = int(attack * SAMPLE_RATE)
    if attack_samples > 0:
        env[:attack_samples] *= np.linspace(0, 1, attack_samples)
    return env


# -- Instrument synthesizers ------------------------------------------------

def marimba_note(freq, duration=0.4):
    """Warm, woody, fast decay. Strong fundamental + 4th harmonic."""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, endpoint=False)
    wave_data = (
        1.00 * np.sin(2 * np.pi * freq * t)
        + 0.40 * np.sin(2 * np.pi * freq * 4 * t)
        + 0.15 * np.sin(2 * np.pi * freq * 9.2 * t)  # slight inharmonic shimmer
    )
    env = envelope_adsr(samples, attack=0.003, decay=6.0)
    return wave_data * env


def glockenspiel_note(freq, duration=2.0):
    """Very bright, bell-like, long shimmer."""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, endpoint=False)
    wave_data = (
        1.00 * np.sin(2 * np.pi * freq * t)
        + 0.85 * np.sin(2 * np.pi * freq * 3 * t)
        + 0.55 * np.sin(2 * np.pi * freq * 5.4 * t)  # slightly inharmonic for that bell shimmer
        + 0.30 * np.sin(2 * np.pi * freq * 7 * t)
    )
    env = envelope_adsr(samples, attack=0.001, decay=2.0)
    return wave_data * env


def toy_piano_note(freq, duration=0.8):
    """Small hammer on small string — slightly detuned, fast decay."""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, endpoint=False)
    # Detuning: harmonics drift slightly sharp (gives that toy character)
    wave_data = (
        1.00 * np.sin(2 * np.pi * freq * t)
        + 0.50 * np.sin(2 * np.pi * freq * 2.02 * t)
        + 0.30 * np.sin(2 * np.pi * freq * 3.05 * t)
        + 0.15 * np.sin(2 * np.pi * freq * 4.1 * t)
    )
    # Light noise burst on attack — that little wood thunk
    noise_burst = np.random.uniform(-0.3, 0.3, int(0.005 * SAMPLE_RATE))
    wave_data[: len(noise_burst)] += noise_burst
    env = envelope_adsr(samples, attack=0.002, decay=4.5)
    return wave_data * env


def vibraphone_note(freq, duration=2.5):
    """Warm metallic with tremolo (the vibe in vibraphone)."""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, endpoint=False)
    wave_data = (
        1.00 * np.sin(2 * np.pi * freq * t)
        + 0.45 * np.sin(2 * np.pi * freq * 3 * t)
        + 0.20 * np.sin(2 * np.pi * freq * 5 * t)
    )
    # Tremolo at ~6Hz — the rotating fans effect
    tremolo = 0.7 + 0.3 * np.sin(2 * np.pi * 6 * t)
    env = envelope_adsr(samples, attack=0.005, decay=1.4)
    return wave_data * env * tremolo


# -- Sequence helpers -------------------------------------------------------

def render_sequence(notes, total_duration, instrument_fn):
    """notes: list of (midi_pitch, start_seconds, note_duration_seconds, velocity)."""
    output = np.zeros(int(SAMPLE_RATE * total_duration))
    for midi, start_s, dur, vel in notes:
        start_idx = int(start_s * SAMPLE_RATE)
        note = instrument_fn(midi_to_freq(midi), dur) * vel
        end_idx = min(start_idx + len(note), len(output))
        output[start_idx:end_idx] += note[: end_idx - start_idx]
    return output


def normalize_and_save(audio, path, peak=0.85):
    audio = audio / np.max(np.abs(audio)) * peak
    audio_int = (audio * 32767).astype(np.int16)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_int.tobytes())
    print(f"Wrote {path}")


# -- Compositions -----------------------------------------------------------

def make_marimba_bounce(out_path):
    """Quick playful triplet: G4-B4-D5-G5, then resolves to major 6 chord (C-E-G-A)."""
    notes = [
        # Bouncy ascending triplet
        (67, 0.00, 0.3, 0.7),   # G4
        (71, 0.10, 0.3, 0.8),   # B4
        (74, 0.20, 0.3, 0.9),   # D5
        (79, 0.32, 0.4, 1.0),   # G5 — peak
        # Land on Cmaj6 chord (C5-E5-G5-A5)
        (72, 0.55, 0.6, 0.9),   # C5
        (76, 0.55, 0.6, 0.7),   # E5
        (79, 0.55, 0.6, 0.6),   # G5
        (81, 0.55, 0.7, 0.5),   # A5 (the 6th)
    ]
    audio = render_sequence(notes, 1.6, marimba_note)
    normalize_and_save(audio, out_path)


def make_glockenspiel_chime(out_path):
    """Three bright ding-ding-DING chimes with held final."""
    notes = [
        (76, 0.00, 1.0, 0.8),   # E5 ding
        (79, 0.18, 1.0, 0.9),   # G5 ding
        (84, 0.36, 2.5, 1.0),   # C6 DING (held)
        # Add an octave higher sparkle on the final
        (88, 0.50, 1.8, 0.4),   # E6 sparkle
    ]
    audio = render_sequence(notes, 3.0, glockenspiel_note)
    normalize_and_save(audio, out_path)


def make_toypiano_arpeggio(out_path):
    """Cheerful descending then resolving figure — Cmaj7 down + back up."""
    notes = [
        (84, 0.00, 0.4, 0.9),   # C6
        (79, 0.13, 0.4, 0.8),   # G5
        (76, 0.26, 0.4, 0.8),   # E5
        (72, 0.39, 0.4, 0.8),   # C5
        # Resolution: D5-E5-G5 quick run + held G5+B5
        (74, 0.55, 0.3, 0.9),   # D5
        (76, 0.65, 0.3, 0.9),   # E5
        (79, 0.78, 1.0, 1.0),   # G5 held
        (83, 0.78, 1.0, 0.7),   # B5 (the maj7)
    ]
    audio = render_sequence(notes, 2.0, toy_piano_note)
    normalize_and_save(audio, out_path)


def make_vibraphone_swoop(out_path):
    """Fast ascending sweep that lands on a sustained major 6th chord with tremolo."""
    # Sweep up the C major scale
    sweep_notes = []
    sweep_pitches = [60, 62, 64, 65, 67, 69, 71, 72]  # C major scale C4-C5
    for i, p in enumerate(sweep_pitches):
        sweep_notes.append((p, i * 0.06, 0.4, 0.6))
    # Land on Cmaj6 chord (C5-E5-G5-A5) with tremolo (it's in the vibraphone synth itself)
    chord = [
        (72, 0.55, 2.0, 1.0),   # C5
        (76, 0.55, 2.0, 0.8),   # E5
        (79, 0.55, 2.0, 0.7),   # G5
        (81, 0.55, 2.0, 0.6),   # A5
    ]
    notes = sweep_notes + chord
    audio = render_sequence(notes, 2.8, vibraphone_note)
    normalize_and_save(audio, out_path)


# -- Main -------------------------------------------------------------------

def main():
    sounds_dir = os.path.join(os.path.dirname(__file__), "sounds")
    os.makedirs(sounds_dir, exist_ok=True)

    make_marimba_bounce(os.path.join(sounds_dir, "katamari_marimba.wav"))
    make_glockenspiel_chime(os.path.join(sounds_dir, "katamari_glockenspiel.wav"))
    make_toypiano_arpeggio(os.path.join(sounds_dir, "katamari_toypiano.wav"))
    make_vibraphone_swoop(os.path.join(sounds_dir, "katamari_vibraphone.wav"))

    print("\nDone! Audition each:")
    print("  afplay sounds/katamari_marimba.wav")
    print("  afplay sounds/katamari_glockenspiel.wav")
    print("  afplay sounds/katamari_toypiano.wav")
    print("  afplay sounds/katamari_vibraphone.wav")
    print("\nPick a favorite and set it as the active sound:")
    print("  cp sounds/katamari_<choice>.wav sounds/piano.wav")


if __name__ == "__main__":
    main()
