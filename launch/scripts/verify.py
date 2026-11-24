from difflib import SequenceMatcher
from pathlib import Path
from zipfile import ZipFile
from contact import contacts
import colorsys
import hashlib
import os
import json
import math
import re
import subprocess

import numpy as np
from PIL import Image
from scipy.ndimage import binary_erosion

LAUNCH = Path(__file__).resolve().parents[1]
DEST = Path(os.environ.get("FILM_OUTPUT", LAUNCH))
OUT = DEST / "out"
WORK = Path(os.environ.get("FILM_CACHE", "/private/tmp/curbcut-v5-build"))
MODELS = Path(os.environ.get("FILM_MODELS", LAUNCH / "models"))
MASTER = DEST / "curbcut-launch.mp4"
TEASER = DEST / "curbcut-launch-15s.mp4"


def run(args):
    job = subprocess.run(list(map(str, args)), check=True, capture_output=True, text=True)
    return job.stdout, job.stderr


def metadata(video):
    raw, _ = run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", video])
    metadata = json.loads(raw)
    v, a = metadata["streams"]
    assert (v["codec_name"], v["width"], v["height"], v["r_frame_rate"]) == ("h264", 1920, 1080, "30/1")
    assert (a["codec_name"], a["channel_layout"], a["sample_rate"]) == ("aac", "stereo", "48000")
    duration = float(metadata["format"]["duration"])
    assert abs(float(a["duration"]) - duration) < .04
    assert abs(int(v["nb_frames"]) / 30 - duration) < .04
    return dict(duration=duration, frames=int(v["nb_frames"]), video="H.264, 1920×1080, 30 fps", audio="AAC stereo, 48 kHz")


def measure(video, audio_filter, pattern):
    _, log = run(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-map", "0:a:0",
                  "-af", audio_filter, "-f", "null", "-"])
    return float(re.findall(pattern, log)[-1])


def levels(video):
    _, ebu = run(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-map", "0:a:0",
                  "-af", "ebur128=peak=true", "-f", "null", "-"])
    loudness = float(re.findall(r"I:\s+([-\d.]+) LUFS", ebu)[-1])
    peak = float(re.findall(r"Peak:\s+([-\d.]+) dBFS", ebu)[-1])
    full = measure(video, "volumedetect", r"mean_volume:\s+([-\d.]+)")
    high = measure(video, "highpass=f=300,volumedetect", r"mean_volume:\s+([-\d.]+)")
    assert abs(loudness + 16) < 1 and peak <= -1 and abs(high - full) < 6
    return dict(integrated_LUFS=loudness, true_peak_dBTP=peak, full_mean_dBFS=full,
                highpass_300Hz_mean_dBFS=high, difference_dB=round(high - full, 1))


def words(text):
    text = text.lower().replace("’", "'").replace("%", " percent").replace("homepages", "home pages")
    variants = {
        "curbcut": "curb cut", "colour": "color", "unlabelled": "unlabeled", "one hundred and five": "105", "one hundred five": "105", "offscreen": "off screen", "may tee": "meity", "may t.": "meity.",
        "mass dot e d u": "mass.edu", "mass dot edu": "mass.edu", "c s c dot gov dot in": "csc.gov.in",
        "color hexa": "colorhexa", "pop-ups": "pop ups", "2,050": "2050", "two thousand fifty": "2050",
    }
    for variant, spelling in variants.items():
        text = text.replace(variant, spelling)
    for n, word in {"1":"one", "2":"two", "3":"three", "4":"four"}.items():
        text = re.sub(r"\b" + n + r"\b", word, text)
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", text)


def transcript(video, target, sections):
    wav = WORK / (target.name + "-16k.wav")
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-vn", "-ar", 16000, "-ac", 1, wav])
    run(["whisper-cli", "-ng", "-np", "-t", 5, "-l", "en", "-m", MODELS / "ggml-small.en.bin",
         "-f", wav, "--prompt", "Curb Cut, Kane, Jev.",
         "--carry-initial-prompt", "-otxt", "-of", target])
    actual = words(target.with_suffix(".txt").read_text())
    expected = []
    ranges = []
    for name, lines in sections.items():
        for i, line in enumerate(lines):
            first = len(expected)
            expected += words(line)
            ranges.append((f"{name}.{i+1}", first, len(expected)))
    sequence = SequenceMatcher(None, expected, actual, autojunk=False)
    matched = set()
    diff = []
    for kind, i, j, a, b in sequence.get_opcodes():
        if kind == "equal":
            matched.update(range(i,j))
        else:
            diff.append(f"{kind} | {' '.join(expected[i:j])} → {' '.join(actual[a:b])}")
    coverage = {name:round(len(matched.intersection(range(a,b))) / (b-a),3) for name,a,b in ranges}
    (WORK / (target.name+"-diff.txt")).write_text("\n".join(diff)+"\n")
    assert len(matched) / len(expected) >= .94, diff
    return dict(script_words=len(expected), matched_words=len(matched), lines=len(ranges), line_match=coverage, differences=diff)


def palette_audit():
    tokens = json.loads((LAUNCH.parent/"core/brand-palette.json").read_text())
    colors = [tuple(bytes.fromhex(c.lstrip("#"))) for c in tokens.values()]
    allowed = [colorsys.rgb_to_hsv(*c)[0] for c in colors if max(c)-min(c)>34]
    maximum = 0
    for cut in ["master","teaser"]:
        for frame in sorted((WORK/("half-second-"+cut)).glob("*.jpg")):
            with Image.open(frame) as im:
                rgb = np.asarray(im.resize((480,270)).convert("RGB"),dtype=np.float32)/255
            hue = np.asarray(Image.fromarray((rgb*255).astype(np.uint8)).convert("HSV"))[:,:,0]/255
            chroma = np.max(rgb,axis=2)-np.min(rgb,axis=2)
            far = np.ones(hue.shape,dtype=bool)
            for value in allowed:
                delta = np.abs(hue-value)
                far &= np.minimum(delta,1-delta)>.05
            unexpected = far & (chroma > .18)
            interior = binary_erosion(unexpected, structure=np.ones((3,3), dtype=bool))
            percent = float(np.mean(interior) * 100)
            assert percent<.08, (frame.name,percent)
            maximum = max(maximum,percent)
    return {"maximum_unexpected_saturated_interior_percent":round(maximum,4)}


def main():
    WORK.mkdir(parents=True,exist_ok=True)
    cuts = json.loads((LAUNCH/"film/word-times.json").read_text())
    report = {}
    for name,movie in [("master",MASTER),("teaser",TEASER)]:
        script = json.loads((LAUNCH/"film"/("narration.json" if name=="master" else "teaser-narration.json")).read_text())
        settings = metadata(movie) | levels(movie)
        assert settings["frames"]==sum(s["frames"] for s in cuts[name])
        assert (name=="master" and 70<=settings["duration"]<=85) or (name=="teaser" and settings["duration"]==15)
        lines = [line for group in script.values() for line in group]
        assert lines==[cue["text"] for s in cuts[name] for cue in s["cues"]]
        track = LAUNCH/"captions"/("launch.vtt" if name=="master" else "teaser.vtt")
        assert track.read_text().strip().split("\n\n")[1:]==[f"{stamp(s['frame']/30+c['start'])} --> {stamp(s['frame']/30+c['end'])}\n{c['text']}" for s in cuts[name] for c in s["cues"]]
        settings["transcript"] = transcript(movie,OUT/("transcript" if name=="master" else "teaser-transcript"),script)
        settings["sha256"] = hashlib.sha256(movie.read_bytes()).hexdigest()
        report[name] = settings
    record = json.loads((LAUNCH/"film/pronunciation.json").read_text())
    live = [v for k,v in record.items() if " live " in k]
    assert len(live)==1 and "lˈaɪv" in live[0]
    report["spoken_live"] = "/laɪv/"
    catalog = json.loads((LAUNCH/"film/plates/index.json").read_text())
    for plate in [p for p in catalog.values() if "member" in p]:
        with ZipFile(LAUNCH.parent/plate["source"]) as pack:
            assert pack.read(plate["member"])==(LAUNCH/"film/plates"/plate["file"]).read_bytes()
    assert [catalog[k]["verdict"] for k in ["efcfdd9f-13","cb96e3af-17"]]==["FAIL","PASS"]
    report["verified_kane_frames"] = ["efcfdd9f-13","cb96e3af-17"]
    geometry = json.loads((OUT/"geometry.json").read_text())
    assert set(geometry)=={s["id"] for shots in cuts.values() for s in shots}
    report["maximum_source_scale"] = round(max(geometry.values()),5)
    assert 0<report["maximum_source_scale"]<=1.25
    report["half_second_frames"] = contacts()
    report["palette"] = palette_audit()
    (OUT/"verification.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps(report,ensure_ascii=False,indent=2))


def stamp(seconds):
    ms = math.floor(seconds*1000+.5)
    return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}"


if __name__=="__main__":
    main()
