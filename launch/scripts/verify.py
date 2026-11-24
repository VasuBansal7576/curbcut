from difflib import SequenceMatcher
from pathlib import Path
from zipfile import ZipFile
import hashlib
import os
import json
import math
import re
import subprocess

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import welch

LAUNCH = Path(__file__).resolve().parents[1]
OUT = LAUNCH / "out"
WORK = Path(os.environ.get("FILM_CACHE", "/private/tmp/curbcut-v5-build"))
MODELS = Path(os.environ.get("FILM_MODELS", LAUNCH / "models"))
MASTER = LAUNCH / "curbcut-launch.mp4"
TEASER = LAUNCH / "curbcut-launch-15s.mp4"


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


def contact_sheet(duration):
    folder = WORK / "contact-frames"
    folder.mkdir(exist_ok=True)
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", MASTER, "-an", "-vf",
         r"select=not(mod(n\,60)),scale=480:270:flags=lanczos", "-fps_mode", "vfr", folder / "%03d.png"])
    count = math.ceil(duration / 2)
    sheet = Image.new("RGB", (480*5, 298*math.ceil(count/5)), "#111214")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(str(LAUNCH / "film/fonts/JetBrainsMono.ttf"), 17)
    for i in range(count):
        frame = Image.open(folder / f"{i+1:03d}.png").convert("RGB")
        assert np.asarray(frame).std() > 15
        x, y = (i % 5)*480, (i // 5)*298
        sheet.paste(frame, (x, y+28))
        draw.text((x+10, y+3), f"{i*2//60:02d}:{i*2%60:02d}", font=font, fill="#FFCE1F")
    sheet.save(OUT / "contact.png")
    return count


def stills():
    beats = json.loads((LAUNCH / "film/beats.json").read_text())
    folder = OUT / "stills"
    folder.mkdir(exist_ok=True)
    frames = {}
    selected = [b for b in beats if "still" in b]
    assert sorted(b["scene"] for b in selected) == sorted({b["scene"] for b in beats})
    for cut, video in [("master", MASTER), ("teaser", TEASER)]:
        marks = sorted((math.ceil(b["wordStart"]*30-.00002)+3, b["still"]) for b in selected if b["cut"] == cut)
        temp = WORK / ("stills-" + cut)
        temp.mkdir(parents=True, exist_ok=True)
        choose = "+".join(f"eq(n\\,{frame})" for frame, _ in marks)
        run(["ffmpeg", "-v", "error", "-y", "-i", video, "-an", "-vf", "select="+choose,
             "-fps_mode", "vfr", temp / "%03d.png"])
        for i, (frame, name) in enumerate(marks, 1):
            target = folder / (name + ".png")
            (temp / f"{i:03d}.png").replace(target)
            assert Image.open(target).size == (1920, 1080)
            phone = folder / "phone"
            phone.mkdir(exist_ok=True)
            Image.open(target).resize((640,360), Image.Resampling.LANCZOS).save(phone / target.name)
            frames[name] = frame
    return frames


def sharpness(stills):
    references = WORK / "references"
    if any(not (references / (name + ".png")).exists() for name in stills):
        run(["node", LAUNCH / "scripts/render.mjs", "stills"])
    scores = {}
    for name in stills:
        filename = name + ".png"
        canvas = np.asarray(Image.open(references / filename).convert("L"), dtype=np.float32)
        decoded = np.asarray(Image.open(OUT / "stills" / filename).convert("L"), dtype=np.float32)
        error = np.mean((canvas - decoded)**2)
        psnr = float(10*np.log10(255**2/max(error, 1e-10)))
        gradient = np.abs(np.diff(canvas, axis=1))
        edges = gradient > 50
        retained = np.abs(np.diff(decoded, axis=1))[edges].sum() / gradient[edges].sum()
        scores[name] = {"luma_psnr_db": round(psnr, 2), "high_contrast_edge_ratio": round(float(retained), 3)}
        assert psnr > 38 and .87 < retained < 1.13, (name, scores[name])
    return scores


def motion(video, frames):
    w, h = 480, 232
    sample = subprocess.check_output(["ffmpeg", "-loglevel", "error", "-i", video, "-an", "-vf",
        r"select=not(mod(n\,15)),crop=1920:928:0:0,scale=480:232:flags=area,format=gray",
        "-fps_mode", "vfr", "-f", "rawvideo", "-"])
    decoded = np.frombuffer(sample, np.uint8).reshape(-1,h,w)
    assert len(decoded) == math.ceil(frames/15)
    changed = []
    pixel_static = []
    quiet = []
    for i, (before, after) in enumerate(zip(decoded, decoded[1:])):
        delta = np.abs(before.astype(np.int16)-after)
        frac = (delta >= 5).mean()
        if not delta.any():
            pixel_static.append(i*15)
        if frac >= .001:
            changed.append(i*15)
        else:
            quiet.append(i*15)
    runs = []
    for frame in quiet:
        if runs and runs[-1][1] == frame:
            runs[-1][1] = frame + 15
        else:
            runs.append([frame, frame+15])
    max_hold = max(((b-a)/30 for a,b in runs), default=0)
    assert max_hold < 2, (video, runs)
    return dict(comparison="Frames n and n+15 at 30 fps, above the subtitle band. Motion requires a luma change "
                           "of at least 5/255 in at least 0.1% of a 480×232 area-downsample.",
                pairs=len(decoded)-1, first_pair=[0,15], last_pair=[(len(decoded)-2)*15,(len(decoded)-1)*15],
                moving_pairs=len(changed), quiet_start_frames=quiet, pixel_static_start_frames=pixel_static,
                longest_quiet_interval_seconds=max_hold)


def words(text):
    text = text.lower().replace("’", "'").replace("%", " percent").replace("homepages", "home pages")
    variants = {
        "curbcut": "curb cut", "offscreen": "off screen", "may tee": "meity", "may t.": "meity.",
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
         "-f", wav, "--prompt", "Curb Cut, Kane CLI, WebAIM, ColorHexa, and Sites search.",
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
    assert min(coverage.values()) >= .70, coverage
    return dict(script_words=len(expected), matched_words=len(matched), lines=len(ranges), line_match=coverage, differences=diff)


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    script = json.loads((LAUNCH / "film/narration.json").read_text())
    sections = {name:lines for name,lines in script.items() if not name.startswith("teaser-")}
    short = {name:lines for name,lines in script.items() if name.startswith("teaser-")}
    cuts = json.loads((LAUNCH / "film/word-times.json").read_text())
    cues = [[s["frame"]/30+c["start"], s["frame"]/30+c["end"], c["text"]] for s in cuts["master"] for c in s["cues"]]
    assert [c[2] for c in cues] == [s for lines in sections.values() for s in lines]
    assert all(0 <= a < b for a,b,_ in cues)
    assert all(prev[1] <= cur[0] for prev,cur in zip(cues,cues[1:]))
    def timestamp(seconds):
        ms = math.floor(1000*seconds+.5)
        return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}"
    vtt = "WEBVTT\n\n" + "\n".join(f"{timestamp(a)} --> {timestamp(b)}\n{text}\n" for a, b, text in cues)
    assert (LAUNCH / "captions/launch.vtt").read_text() == vtt
    report = {}
    for video, name in [(MASTER, "master"), (TEASER, "teaser")]:
        report[name] = metadata(video) | levels(video)
        audio_hash, _ = run(["ffmpeg", "-v", "error", "-i", video, "-map", "0:a:0", "-c", "copy", "-f", "hash", "-hash", "sha256", "-"])
        report[name]["aac_packet_sha256"] = audio_hash.strip().split("=")[1]
        report[name]["sha256"] = hashlib.sha256(video.read_bytes()).hexdigest()
    assert report["master"]["frames"] == sum(shot["frames"] for shot in cuts["master"])
    assert report["teaser"]["duration"] == 15
    report["contact_frames"] = contact_sheet(report["master"]["duration"])
    report["stills_by_frame"] = stills()
    report["decoded_still_vs_lossless_canvas"] = sharpness(report["stills_by_frame"])
    for name, video in [("master", MASTER), ("teaser", TEASER)]:
        report[name]["motion"] = motion(video, report[name]["frames"])
    report["master"]["transcript"] = transcript(MASTER, OUT / "transcript", sections)
    report["teaser"]["transcript"] = transcript(TEASER, WORK / "teaser-transcript", short)
    if (WORK / "master-bed.wav").exists():
        bed, rate = sf.read(WORK / "master-bed.wav")
        voice, _ = sf.read(WORK / "master-voice.wav")
        hz, energy = welch(bed, fs=rate, nperseg=8192, axis=0)
        pct = 100 * energy[(hz >= 200) & (hz <= 4000)].sum() / energy.sum()
        report["bed_energy_200Hz_to_4kHz_percent"] = round(float(pct), 2)
        report["voice_over_ducked_bed_rms_dB"] = round(float(10*np.log10(np.mean(voice**2)/np.mean(bed**2))), 1)
        hz, speech = welch(voice, fs=rate, nperseg=8192)
        speech_pct = 100 * speech[(hz >= 200) & (hz <= 4000)].sum() / speech.sum()
        report["speech_energy_200Hz_to_4kHz_percent"] = round(float(speech_pct), 2)
        assert speech_pct > 50
        assert pct > 50 and report["voice_over_ducked_bed_rms_dB"] > 6
    report["minimum_visible_page_percent"] = {
        p.name.removesuffix("-coverage.json"): round(100*json.loads(p.read_text()),2)
        for p in WORK.glob("*-coverage.json") if json.loads(p.read_text()) < 1
    }
    assert len(report["minimum_visible_page_percent"]) == 17 and "worms" in report["minimum_visible_page_percent"]
    plates = LAUNCH / "film/plates"
    evidence = [p for p in json.loads((plates / "index.json").read_text()).values() if p.get("member")]
    for plate in evidence:
        with ZipFile(LAUNCH.parent / plate["source"]) as pack:
            assert pack.read(plate["member"]) == (plates / plate["file"]).read_bytes(), plate["file"]
    report["evidence_stills_matching_pack"] = len(evidence)
    assert min(report["minimum_visible_page_percent"].values()) >= 70
    report["live_g2p"] = json.loads((LAUNCH / "film/pronunciation.json").read_text())[sections["verified"][0]]
    assert "lˈaɪv" in report["live_g2p"]
    (OUT / "verification.json").write_text(json.dumps(report, indent=2, ensure_ascii=False)+"\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
