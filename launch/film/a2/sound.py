import json
import os
import re
import subprocess
from pathlib import Path

import numpy as np
import onnxruntime
import soundfile
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
LAUNCH = HERE.parents[1]
CACHE = Path(os.environ["FILM_CACHE"])
RATE = 24000
shots = json.loads((HERE / "edit.json").read_text())
total = sum(s["duration"] for s in shots)
mix = np.zeros(total * RATE, dtype=np.float32)
options = onnxruntime.SessionOptions()
options.intra_op_num_threads = 4
engine = Kokoro.from_session(onnxruntime.InferenceSession(str(CACHE / "kokoro.onnx"), options, providers=["CPUExecutionProvider"]), str(CACHE / "voices.bin"))
cues = []

def raw_audio(path):
    data = subprocess.check_output(["ffmpeg", "-loglevel", "error", "-i", str(path), "-ar", str(RATE), "-ac", "1", "-f", "f32le", "-"])
    return np.frombuffer(data, np.float32)

def place(at, samples):
    begin = round(at * RATE)
    mix[begin:begin + len(samples)] += samples

for shot in shots:
    phrases = []
    for line in shot["lines"]:
        voice = "af_heart"
        if line.startswith("@"):
            voice, line = line[1:].split("|", 1)
        for phrase in re.split(r"(?<=[.!?]) (?=[A-Z])", line):
            if voice == "af_heart":
                spoken = phrase.replace("are live", "are lyve").replace("TypeSafe", "Type Safe").replace("Codex", "Code ex")
                samples, sr = engine.create(spoken, voice=voice, speed=1.05)
            else:
                audio = CACHE / "announcement.aiff"
                subprocess.run(["say", "-v", voice, "-r", "165", "-o", str(audio), phrase], check=True)
                samples = raw_audio(audio)
            idx = np.flatnonzero(abs(samples) > .005)
            samples = samples[max(0, idx[0]-500):idx[-1]+1400]
            phrases.append((phrase, samples, voice))
    duration = shot["duration"]
    gap = .16
    available = duration - .55 - gap * (len(phrases)-1)
    speed = max(1, sum(len(samples) for _, samples, _ in phrases) / RATE / available)
    pos = shot["start"] + .24
    for line, samples, voice in phrases:
        if speed > 1.001:
            data = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(RATE), "-ac", "1", "-i", "-", "-af", f"atempo={speed}", "-f", "f32le", "-"], input=samples.astype("float32").tobytes(), stdout=subprocess.PIPE, check=True).stdout
            samples = np.frombuffer(data, np.float32)
        samples = samples * min(6, .112 / max(.001,np.sqrt(np.mean(samples**2))))
        place(pos, samples)
        end = pos + len(samples)/RATE
        label = line.replace("D H E", "DHE").replace("Mass dot E D U", "Mass.edu").replace("curb cut check", "curbcut check").replace("Curb cut gate", "curbcut gate")
        cues.append({"start":round(pos,3), "end":round(end,3), "text":label, "voice":voice, "shot":shot["id"]})
        pos = end + gap
    assert pos-gap < shot["start"] + duration, (shot["id"],pos)
    print(shot["id"],round(speed,2),flush=True)
for at, name in [(2.72,"key-press"),(3.82,"key-press"),(8.35,"click-soft"),(10.58,"key-press"),(15.3,"click-soft"),(34,"key-press"),(47.5,"pop"),(54.4,"click-soft"),(59.23,"pop"),(64,"key-press"),(86,"key-press"),(100,"click-soft"),(110,"key-press"),(148,"key-press"),(185,"key-press"),(210,"click-soft")]:
    samples = raw_audio(LAUNCH/"audio/sfx"/(name+".mp3"))
    place(at, samples*.045/max(.001,max(abs(samples))))
soundfile.write(CACHE/"mix.wav",mix,RATE,subtype="FLOAT")
subprocess.run(["ffmpeg","-y","-v","error","-i",str(CACHE/"mix.wav"),"-af","loudnorm=I=-16:TP=-1.5:LRA=7","-ar","48000","-c:a","aac","-b:a","160k",str(LAUNCH/"audio/demo.m4a")],check=True)
(HERE/"speech.json").write_text(json.dumps(cues,indent=2,ensure_ascii=False)+"\n")
def stamp(t):
    ms=round(t*1000)
    return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}"
for name,limit in [("demo",total),("launch",75),("teaser",15)]:
    blocks=["WEBVTT"]
    for cue in cues:
        if cue["start"]>=limit:
            break
        text=cue["text"]
        if cue["voice"]!="af_heart":
            text="[Reading voice] "+text
        blocks.append(stamp(cue["start"])+" --> "+stamp(min(limit,cue["end"]))+"\n"+text)
    (LAUNCH/"captions"/(name+".vtt")).write_text("\n\n".join(blocks)+"\n")
