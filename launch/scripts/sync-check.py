from bisect import bisect_left
from collections import defaultdict
from pathlib import Path
import hashlib
import json
import subprocess

import numpy as np

LAUNCH = Path(__file__).resolve().parents[1]
OUT = LAUNCH / "out"
FPS = 30
LIMIT = .2
THRESHOLD = 3.0
MOVIES = {"master": "curbcut-launch.mp4", "teaser": "curbcut-launch-15s.mp4"}


def measure(cut, movie, beats):
    probe = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_frames",
                                     "-show_entries", "frame=best_effort_timestamp_time", "-of", "json", movie])
    times = [float(f["best_effort_timestamp_time"]) for f in json.loads(probe)["frames"]]
    assert all(abs(t - n/FPS) < .000001 for n, t in enumerate(times))
    candidates = defaultdict(list)
    measured = []
    for beat in beats:
        if beat["cut"] != cut:
            continue
        x, y, w, h = beat["region"]
        assert 0 <= x < x + w <= 1920 and 0 <= y < y + h <= 976
        first = bisect_left(times, beat["wordStart"] - .000001)
        row = dict(scene=beat["scene"], word=beat["word"], event=beat["event"], word_start=beat["wordStart"],
                   region=beat["region"], first_frame=None, offset_seconds=None)
        measured.append(row)
        for frame in range(first, first + 16):
            candidates[frame].append((row, np.s_[y//2:(y+h)//2, x//2:(x+w)//2]))
    decoder = subprocess.Popen(["ffmpeg", "-v", "error", "-i", movie, "-map", "0:v:0", "-an", "-vf",
                                "scale=960:540:flags=area,format=gray", "-fps_mode", "passthrough",
                                "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    previous = None
    number = 0
    while data := decoder.stdout.read(960*540):
        pixels = np.frombuffer(data, np.uint8).reshape(540, 960)
        for row, region in candidates.get(number, []):
            if row["first_frame"] is not None:
                continue
            difference = np.abs(pixels[region].astype(np.int16) - previous[region]).mean()
            if difference > THRESHOLD:
                row.update(first_frame=number, frame_time=times[number],
                           offset_seconds=round(times[number]-row["word_start"], 6), mean_luma_difference=round(difference, 3))
        previous = pixels
        number += 1
    assert decoder.wait() == 0
    assert number == sum(s["frames"] for s in json.loads((LAUNCH / "film/word-times.json").read_text())[cut])
    for row in measured:
        row["passed"] = row["offset_seconds"] is not None and abs(row["offset_seconds"]) <= LIMIT
    offsets = [abs(row["offset_seconds"]) for row in measured if row["offset_seconds"] is not None]
    return dict(sha256=hashlib.sha256(movie.read_bytes()).hexdigest(), frames=number, beats=len(measured),
                passed=sum(row["passed"] for row in measured), worst_offset_seconds=max(offsets, default=None), measurements=measured)


def main():
    beats = json.loads((LAUNCH / "film/beats.json").read_text())
    report = dict(fps=FPS, limit_seconds=LIMIT, mean_luma_threshold=THRESHOLD,
                  method="First decoded frame at or after word onset with a consecutive-frame mean absolute luma difference above threshold in the event region. Area-downsampled 2:1. Subtitles excluded.")
    for cut, name in MOVIES.items():
        report[cut] = measure(cut, LAUNCH/name, beats)
    rows = [row for cut in MOVIES for row in report[cut]["measurements"]]
    misses = [row for row in rows if not row["passed"]]
    detected = [row for row in rows if row["offset_seconds"] is not None]
    worst = max(detected, key=lambda row: abs(row["offset_seconds"]), default=None)
    report["summary"] = dict(beats=len(rows), passed=len(rows)-len(misses), missed=len(misses),
                             worst_offset_seconds=abs(worst["offset_seconds"]) if worst else None,
                             worst_scene=worst["scene"] if worst else None, worst_word=worst["word"] if worst else None)
    (OUT / "sync.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report["summary"]))
    for row in misses:
        print(row)
    if misses:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
