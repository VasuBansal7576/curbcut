from pathlib import Path
import hashlib
import os
import json
import re

import numpy as np
import onnxruntime as rt
import soundfile as sf
from kokoro_onnx import Kokoro


LAUNCH = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("FILM_CACHE", "/private/tmp/curbcut-v5-build"))
MODEL = Path(os.environ.get("FILM_MODELS", LAUNCH / "models"))
SPEED = 1.04
VOICE = "af_heart"


def spoken(line):
    substitutions = {
        "2026": "twenty twenty-six", "95.9": "ninety-five point nine",
        "2,050": "two thousand fifty", "142": "one hundred forty two", "99": "ninety nine",
        "118": "one hundred eighteen", "105": "one hundred five", "400": "four hundred",
        "76": "seventy six", "61": "sixty one", "13": "thirteen", "15": "fifteen",
        "20": "twenty", "11": "eleven", "7": "seven", "Jev": "Jev", "TypeSafe": "Type Safe",
        "51": "fifty one", "89": "eighty nine", "43": "forty three", "live": "lyve", "mass.edu": "Mass dot E D U",
        "csc.gov.in": "C S C dot gov dot in", "ABOUT": "About", "MeitY": "May tee",
        "ColorHexa": "Color Hexa", "“": "", "”": "", "…": ",",
    }
    for source, wording in substitutions.items():
        line = re.sub(r"(?<!\w)" + re.escape(source) + r"(?!\w)", wording, line) if source[0].isalnum() else line.replace(source, wording)
    return line


def pronunciation(engine, line):
    phones = engine.tokenizer.phonemize(spoken(line), "en-us")
    if "15 names" in line:
        phones = phones.replace("fˈɪftiːn", "fˌɪftˈiːn")
    if line.startswith("Step one."):
        phones = phones.replace("stˈɛp", "stˈɛp,", 1)
    return phones


def main():
    options = rt.SessionOptions()
    options.intra_op_num_threads = 4
    session = rt.InferenceSession(str(MODEL / "kokoro.onnx"), options, providers=["CPUExecutionProvider"])
    kokoro = Kokoro.from_session(session, str(MODEL / "voices.bin"))
    script = json.loads((LAUNCH / "film/narration.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    record = {}
    checks = {}
    for scene, lines in script.items():
        record[scene] = []
        for line in lines:
            text = spoken(line)
            phones = pronunciation(kokoro, line)
            checks[line] = phones
            if "live" in line:
                assert "lˈaɪv" in phones, phones
            identity = phones if phones != kokoro.tokenizer.phonemize(text, "en-us") else text
            key = hashlib.sha256(f"{VOICE}|{SPEED}|{identity}".encode()).hexdigest()[:16]
            wav = OUT / f"voice-{key}.wav"
            if not wav.exists():
                audio, rate = kokoro.create(phones, voice=VOICE, speed=SPEED, is_phonemes=True)
                active = np.flatnonzero(abs(audio) > .004)
                audio = audio[max(0,active[0]-int(rate*.04)):active[-1]+int(rate*.08)]
                sf.write(wav, audio, rate)
            record[scene].append({"text": line, "wav": wav.name, "seconds": sf.info(wav).duration})
        print(scene, round(sum(row["seconds"] for row in record[scene]), 2), flush=True)
    (LAUNCH / "film/pronunciation.json").write_text(json.dumps(checks, ensure_ascii=False, indent=2))
    (OUT / "voice.json").write_text(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
