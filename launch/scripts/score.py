from pathlib import Path
import json
import math
import subprocess

import numpy as np
import soundfile as sf
from timings import align_line, timing_model
from voice import OUT
from scipy.signal import butter, resample_poly, sosfilt

LAUNCH = Path(__file__).resolve().parents[1]
RATE = 48000
FPS = 30


def music(seconds):
    beat = 60 / 88
    total = round(RATE * seconds)
    bed = np.zeros((total, 2), dtype=np.float32)
    chords = [(62, 65, 69, 72), (58, 65, 69, 72), (60, 64, 67, 71), (57, 64, 67, 72)]
    for bar in range(math.ceil(seconds / (4 * beat))):
        chord = chords[bar % len(chords)]
        for n, (offset, pitch, length, velocity) in enumerate([
            (0, chord[0], 3.8, .62), (.04, chord[1], 3.8, .50),
            (.10, chord[2], 3.65, .46), (.14, chord[3], 3.6, .32),
            (1.5, chord[2] + 12, 1.9, .28), (2.75, chord[1] + 12, 1.2, .22),
        ]):
            start = round((bar * 4 + offset) * beat * RATE)
            count = min(round(length * beat * RATE), total - start)
            if count <= 0:
                continue
            t = np.arange(count) / RATE
            freq = 440 * 2 ** ((pitch - 69) / 12)
            phase = 2 * np.pi * freq * t
            envelope = (1 - np.exp(-45 * t)) * np.exp(-1.9 * t)
            envelope *= np.minimum(1, (count / RATE - t) / .13)
            for ch in range(2):
                detune = 1 + (.0008 if ch else -.0008)
                tone = np.sin(phase) + .34 * np.sin(2 * phase * detune) + .15 * np.sin(3 * phase)
                bed[start:start+count, ch] += velocity * tone * envelope * (.85 if n % 2 == ch else .66)
    t = np.arange(total) / RATE
    fade = np.minimum(1, t / .13) * np.minimum(1, (seconds - t) / .5)
    return bed * fade[:, None]


def timeline(name, script):
    scenes = []
    start = 0
    for scene, rows in script.items():
        pos = .095
        cues = []
        for i, row in enumerate(rows):
            end = pos + row["seconds"]
            cues.append(dict(row, start=pos, end=end))
            pos = end + (.075 if i < len(rows) - 1 else .085)
        minimum = 3.2
        frames = math.ceil(max(pos, minimum) * FPS)
        if name == "teaser":
            frames = {"teaser-before": 160, "teaser-after": 160, "teaser-title": 130}[scene]
            assert end < frames / FPS
        scenes.append(dict(id=scene, frame=start, frames=frames, cues=cues))
        start += frames
    return scenes


def sound_effects(scenes, length):
    folder = LAUNCH / "audio/sfx"
    cues = {
        "skip": [("key-press", "tab"), ("impact-bass-1", "skipped")],
        "title": [("whoosh-short", "curb")], "control": [("pop", "works")],
        "test": [("impact-bass-1", "fails")], "prove": [("key-press", "enter")],
        "share": [("click-soft", "everyone")], "mass-on": [("key-press", "enter")],
        "mass-proof": [("impact-bass-1", "failed"), ("pop", "reached")],
        "worms": [("impact-bass-1", "failed"), ("pop", "passed")],
        "results": [("pop", "99")], "retire": [("whoosh-short", "retires")],
        "close": [("whoosh-short", "curb")], "teaser-title": [("whoosh-short", "curb")],
        "teaser-before": [("key-press", "tab")], "teaser-after": [("key-press", "enter")],
    }
    sounds = {}
    out = np.zeros(length, dtype=np.float32)
    for scene in scenes:
        words = {word.lower().strip(".,?!"): t for cue in scene["cues"] for word, t in cue["words"]}
        for sound, at in cues.get(scene["id"], []):
            if sound not in sounds:
                data = subprocess.check_output(["ffmpeg", "-loglevel", "error", "-i", folder / (sound + ".mp3"),
                                                "-ar", str(RATE), "-ac", "1", "-f", "f32le", "-"])
                data = np.frombuffer(data, dtype="<f4")
                data = data[np.flatnonzero(abs(data) > .035 * np.max(abs(data)))[0]:]
                data = data[:int(RATE * (.45 if sound.startswith("impact") else .32))].copy()
                data[-960:] *= np.linspace(1, 0, 960)
                sounds[sound] = data * (.075 / np.max(abs(data)))
            at = words[at] if isinstance(at, str) else at
            start = round((scene["frame"]/FPS + at) * RATE)
            samples = sounds[sound][:length-start]
            out[start:start+len(samples)] += samples
    return out


def mix(name, scenes):
    seconds = sum(s["frames"] for s in scenes) / FPS
    voice = np.zeros(round(seconds * RATE), dtype=np.float32)
    edges = []
    for scene in scenes:
        for cue in scene["cues"]:
            audio, sr = sf.read(OUT / cue["wav"])
            audio = resample_poly(audio, RATE // sr, 1)
            start = round((scene["frame"] / FPS + cue["start"]) * RATE)
            voice[start:start+len(audio)] = audio
            edges.extend([(start / RATE - .08, .9), (start / RATE, .47),
                          ((start + len(audio)) / RATE, .47), ((start + len(audio)) / RATE + .30, .9)])
    voice = sosfilt(butter(2, 100, fs=RATE, btype="highpass", output="sos"), voice)
    voice = .68 * voice + .32 * sosfilt(butter(1, 320, fs=RATE, btype="highpass", output="sos"), voice)
    voice = np.tanh(1.8 * voice) / 1.8
    bed = music(seconds)
    bed *= (.027 / np.sqrt(np.mean(bed ** 2)))
    time = np.arange(len(voice)) / RATE
    duck = np.ones(len(voice))
    for i in range(0, len(edges), 4):
        x, y = zip(*edges[i:i+4])
        a = max(0, int(x[0] * RATE))
        b = min(len(voice), math.ceil(x[-1] * RATE))
        duck[a:b] = np.minimum(duck[a:b], np.interp(time[a:b], x, y))
    bed *= duck[:, None]
    sf.write(OUT / f"{name}-bed.wav", bed, RATE)
    sf.write(OUT / f"{name}-voice.wav", voice, RATE)
    sfx = sound_effects(scenes, len(voice))
    raw = OUT / f"{name}-mix.wav"
    sf.write(raw, voice[:, None] + bed + sfx[:, None], RATE, subtype="FLOAT")
    params = "loudnorm=I=-16:TP=-1.6:LRA=8"
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", str(raw)]
    first = subprocess.run(cmd + ["-af", params + ":print_format=json", "-f", "null", "-"], capture_output=True, text=True, check=True)
    levels = json.JSONDecoder().raw_decode(first.stderr[first.stderr.rfind("{"):])[0]
    args = dict(measured_I="input_i", measured_TP="input_tp", measured_LRA="input_lra", measured_thresh="input_thresh", offset="target_offset")
    filters = params + "".join(f":{k}={levels[v]}" for k, v in args.items()) + ":linear=true"
    subprocess.run(cmd + ["-y", "-loglevel", "error", "-af", filters, "-ar", str(RATE), "-t", str(seconds), "-c:a", "aac", "-b:a", "256k", str(OUT / f"{name}.m4a")], check=True)
    return seconds


def main():
    lines = json.loads((OUT / "voice.json").read_text())
    engine = timing_model()
    cuts = {}
    for name in ["master", "teaser"]:
        script = {k:v for k,v in lines.items() if k.startswith("teaser-") == (name == "teaser")}
        scenes = timeline(name, script)
        for scene in scenes:
            for cue in scene["cues"]:
                cue["words"] = align_line(engine, cue)
        seconds = mix(name, scenes)
        assert 100 <= seconds <= 145 if name == "master" else seconds == 15
        for scene in scenes:
            for cue in scene["cues"]:
                del cue["seconds"], cue["wav"]
        cuts[name] = scenes
        (LAUNCH / "audio" / f"{name}.m4a").write_bytes((OUT / f"{name}.m4a").read_bytes())
        print(name, seconds, flush=True)
    (LAUNCH / "film/word-times.json").write_text(json.dumps(cuts, ensure_ascii=False, indent=2)+"\n")


if __name__ == "__main__":
    main()
