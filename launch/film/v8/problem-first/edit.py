import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "launch/direction/v8/problem-first"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = "94189fb"
RATE = 48000
END = 3559
OFFSET = 26.5

def original(file):
    return subprocess.check_output(["git", "show", f"{SOURCE}:launch/{file}"], cwd=ROOT)

def stamp(time):
    ms = round(1000 * time)
    return f"00:{ms // 60000:02}:{ms // 1000 % 60:02}.{ms % 1000:03}"

def phrases(cue, at, line):
    words = cue["words"]
    groups = [part.strip().replace(" / ", "\n") for part in line.split("|")]
    if " ".join(" ".join(group.split()) for group in groups) != cue["text"]:
        raise ValueError(f"Caption differs from the recording: {line}")
    result = []
    index = 0
    for text in groups:
        start = at + words[index][1]
        index += len(text.split())
        end = words[index][1] if index < len(words) else cue["end"]
        result.append((start, at + end, text))
    return result

lines = iter(Path(__file__).with_name("captions.txt").read_text().splitlines())
sections = json.loads(original("film/word-times.json"))["master"]
captions = []
for section in sections:
    if section["id"] in {"results", "six"}:
        continue
    for cue in section["cues"]:
        if section["id"] == "verified" and not cue["text"].startswith("Today,"):
            continue
        offset = OFFSET if section["id"] in {"verified", "owner", "close"} else 0
        captions.extend(phrases(cue, section["frame"] / 30 - offset, next(lines)))

assert next(lines, None) is None

(OUT / "launch.vtt").write_text("WEBVTT\n\n" + "\n\n".join(
    f"{stamp(start)} --> {stamp(end)}\n{line}" for start, end, line in captions
) + "\n")

with tempfile.TemporaryDirectory() as directory:
    master = Path(directory) / "source.m4a"
    master.write_bytes(original("audio/master.m4a"))
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", master, "-ar", str(RATE), "-ac", "2", "-f", "f32le", "-"])
    source = np.frombuffer(raw, dtype="<f4").reshape(-1, 2)
    first_end = round(99.1 * RATE)
    resume = 3772 * (RATE // 30)
    second_start = resume - round(OFFSET * RATE)
    samples = np.zeros((END * (RATE // 30), 2), dtype="<f4")
    samples[:first_end] = source[:first_end]
    tail = source[resume:resume + len(samples) - second_start]
    samples[second_start:second_start + len(tail)] = tail
    fade = round(.036 * RATE)
    left, right = first_end - fade, second_start + fade
    music_at = round(2.60 * RATE)
    music = source[music_at:music_at + right - left].copy()
    angle = np.linspace(0, np.pi / 2, fade)[:, None]
    music[:fade] = music[:fade] * np.sin(angle) + samples[left:first_end] * np.cos(angle)
    music[-fade:] = music[-fade:] * np.cos(angle) + samples[second_start:right] * np.sin(angle)
    samples[left:right] = music
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", "-",
                    "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", OUT / "launch-audio.m4a"],
                   input=samples.tobytes(), check=True)
