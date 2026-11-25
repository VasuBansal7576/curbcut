import json
import os
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

HERE = Path(__file__).resolve().parent
LAUNCH = HERE.parents[1]
WORK = Path(os.environ["FILM_CACHE"])
timeline = json.loads((WORK/"edits.json").read_text())
outputs = [
    ("launch", "curbcut-launch", "master"),
    ("teaser", "curbcut-launch-15s", "teaser"),
    ("demo", "curbcut-demo", "demo"),
]
delivery = WORK/"delivery"
delivery.mkdir(exist_ok=True)

def compress(name):
    source = WORK/"segments"/(name+".mp4")
    target = delivery/(name+".mp4")
    if target.exists() and target.stat().st_mtime_ns > source.stat().st_mtime_ns:
        return
    temporary = delivery/(name+".part.mp4")
    subprocess.run(["ffmpeg","-y","-v","error","-i",source,"-an","-c:v","libx264",
                    "-preset","fast","-crf","17","-threads","3","-bf","0","-pix_fmt","yuv420p",
                    "-video_track_timescale","30000",temporary],check=True)
    temporary.replace(target)

with ThreadPoolExecutor(max_workers=3) as workers:
    list(workers.map(compress,timeline["demo"]))

for cut, filename, audio in outputs:
    playlist = WORK/(cut+".txt")
    playlist.write_text("".join(f"file '{delivery/(name+'.mp4')}'\n" for name in timeline[cut]))
    subprocess.run(["ffmpeg","-y","-v","error","-f","concat","-safe","0","-i",playlist,
                    "-i",LAUNCH/"audio"/(audio+".m4a"),"-i",LAUNCH/"captions"/(cut+".vtt"),
                    "-map","0:v","-map","1:a","-map","2:s","-c","copy",
                    "-bsf:v","setts=pts=N*1000:dts=N*1000:duration=1000:time_base=1/30000",
                    "-video_track_timescale","30000","-c:s","mov_text","-metadata:s:s:0","language=eng",
                    "-disposition:s:0","0","-movflags","+faststart",LAUNCH/(filename+".mp4")],check=True)
