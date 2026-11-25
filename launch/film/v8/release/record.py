import json
import math
import os
import sys
from pathlib import Path

import numpy as np
import onnxruntime as rt
import soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

HERE = Path(__file__).resolve().parent
LAUNCH = HERE.parents[2]
WORK = Path(os.environ["FILM_CACHE"])
MODELS = Path(os.environ["FILM_MODELS"])
sys.path.insert(0, str(LAUNCH / "scripts"))
from voice import Kokoro, SPEED, VOICE, pronunciation

work_voice = WORK / "voice"
work_voice.mkdir(parents=True, exist_ok=True)
options = rt.SessionOptions()
options.intra_op_num_threads = 4
engine = Kokoro.from_session(rt.InferenceSession(str(MODELS / "kokoro.onnx"), options, providers=["CPUExecutionProvider"]), str(MODELS / "voices.bin"))
lines = json.loads((HERE / "lines.json").read_text())
timing = {}
for name, text in lines.items():
    spoken = text.replace("106", "one hundred six").replace("62", "sixty two").replace("OpenSeaMap", "Open Sea Map")
    wav, rate = engine.create(pronunciation(engine, spoken), voice=VOICE, speed=SPEED, is_phonemes=True)
    active = np.flatnonzero(abs(wav) > .004)
    wav = wav[max(0, active[0] - round(.04*rate)):active[-1] + round(.08*rate)]
    wav = resample_poly(wav, 48000, rate)
    wav = sosfilt(butter(2, 100, fs=48000, btype="highpass", output="sos"), wav)
    wav = .68 * wav + .32 * sosfilt(butter(1, 320, fs=48000, btype="highpass", output="sos"), wav)
    wav = np.tanh(1.8*wav)/1.8
    sf.write(work_voice / (name+".wav"), wav, 48000, subtype="FLOAT")
    frames = math.ceil((len(wav)/48000+.30)*30)
    if name in {"mapMouse","mapPopup","queue","publisher","recordings"}:
        frames = max(frames, 66)
    timing[name] = {"frames":frames,"seconds":round(len(wav)/48000,4)}
    print(name,timing[name],flush=True)
(HERE / "timing.json").write_text(json.dumps(timing,indent=2)+"\n")
