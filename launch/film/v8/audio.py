import ast
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import onnxruntime as rt
import soundfile as sf
from scipy.signal import resample_poly

HERE = Path(__file__).resolve().parent
LAUNCH = HERE.parents[1]
WORK = Path(os.environ["FILM_CACHE"])
sys.path.insert(0, str(LAUNCH / "scripts"))
from voice import Kokoro, SPEED, VOICE, pronunciation

options = rt.SessionOptions()
options.intra_op_num_threads = 4
model = Path(os.environ["FILM_MODELS"])
engine = Kokoro.from_session(rt.InferenceSession(str(model / "kokoro.onnx"), options, providers=["CPUExecutionProvider"]), str(model / "voices.bin"))
editorial = []
pieces = []
offset = 0
for name, *lines in json.loads((HERE / "chapter.json").read_text()):
    cues = []
    cursor = .22
    for i, line in enumerate(lines):
        spoken = line.replace("curbcut check", "curb cut check")
        wave, rate = engine.create(pronunciation(engine, spoken), voice=VOICE, speed=SPEED, is_phonemes=True)
        active = np.flatnonzero(abs(wave) > .004)
        wave = wave[max(0, active[0]-int(rate*.04)):active[-1]+int(rate*.08)]
        wave = resample_poly(wave, 48000, rate)
        pieces.append((round((offset+cursor)*48000), wave))
        cues.append(dict(start=cursor, end=cursor+len(wave)/48000, text=line))
        cursor = cues[-1]["end"] + .42
    duration = math.ceil((cursor+.45)*2)/2
    editorial.append(dict(id=name, start=offset, duration=duration, cues=cues))
    offset += duration
    print(name, duration, flush=True)
tree = ast.parse((LAUNCH / "scripts/score.py").read_text())
music_fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "music")
namespace = dict(np=np, math=math, RATE=48000)
exec(compile(ast.Module(body=[music_fn], type_ignores=[]), "score.py", "exec"), namespace)
bed = namespace["music"](offset).astype(np.float32)*.044
for start, wave in pieces:
    bed[start:start+len(wave)] += wave[:, None]*.87
sf.write(WORK / "chapter.wav", bed, 48000)
(HERE / "chapter-timing.json").write_text(json.dumps(editorial, indent=2)+"\n")
