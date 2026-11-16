"""Generate a soft piano-style completion arpeggio. Run once to create sounds/piano.wav."""
import numpy as np
import wave
import struct
import os

SAMPLE_RATE = 44100

def piano_note(freq, duration, sample_rate=SAMPLE_RATE):
    """Crude additive piano note: fundamental + harmonics with exponential decay."""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    # Harmonic stack — piano has rich harmonics
    wave_data = (
        1.00 * np.sin(2 * np.pi * freq * t) +
        0.55 * np.sin(2 * np.pi * freq * 2 * t) +
        0.32 * np.sin(2 * np.pi * freq * 3 * t) +
        0.18 * np.sin(2 * np.pi * freq * 4 * t) +
        0.09 * np.sin(2 * np.pi * freq * 5 * t)
    )
    # Piano-like envelope: fast attack, slow decay
    envelope = np.exp(-3.5 * t)
    attack_samples = int(0.005 * sample_rate)
    envelope[:attack_samples] *= np.linspace(0, 1, attack_samples)
    return wave_data * envelope

def midi_to_freq(midi_note):
    return 440.0 * (2 ** ((midi_note - 69) / 12))

def main():
    # A gentle resolving phrase — Cmaj7 arpeggio up, then resolve to C
    # MIDI: C4=60, E4=64, G4=67, B4=71, C5=72
    notes = [
        (60, 0.18),   # C4
        (64, 0.18),   # E4
        (67, 0.18),   # G4
        (72, 0.50),   # C5 hold
    ]
    note_offset = 0.0
    inter_note = 0.16  # gap between note onsets — gives the arpeggio its pace
    total_duration = 2.5
    output = np.zeros(int(SAMPLE_RATE * total_duration))

    for i, (midi, dur) in enumerate(notes):
        start = int(note_offset * SAMPLE_RATE)
        note = piano_note(midi_to_freq(midi), dur + 0.6)
        end = min(start + len(note), len(output))
        output[start:end] += note[:end - start] * 0.3
        note_offset += inter_note

    # Add a soft sustained C5 + E5 chord at the end for a nicer resolution
    final_chord_start = note_offset
    chord_dur = 1.0
    for midi in (72, 76):  # C5 + E5
        start = int(final_chord_start * SAMPLE_RATE)
        note = piano_note(midi_to_freq(midi), chord_dur)
        end = min(start + len(note), len(output))
        output[start:end] += note[:end - start] * 0.2

    # Normalize and convert to int16
    output = output / np.max(np.abs(output)) * 0.85
    output_int = (output * 32767).astype(np.int16)

    out_path = os.path.join(os.path.dirname(__file__), "sounds", "piano.wav")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with wave.open(out_path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(output_int.tobytes())
    print(f"Wrote {out_path}")

if __name__ == "__main__":
    main()
