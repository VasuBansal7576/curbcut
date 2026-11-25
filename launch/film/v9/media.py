import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
WORK = Path(os.environ["FILM_CACHE"])
MEDIA = WORK / "media"
MEDIA.mkdir(parents=True, exist_ok=True)
MASS = "proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/"
OCEAN = "proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/"
SHOP = "launch/footage/"
sources = {
    "shopBefore": (SHOP+"check-kane-before.mp4", 68, 10, "crop=1280:750:0:0"),
    "shopAfter": (SHOP+"check-kane-after.mp4", 84.5, 12, "crop=1280:750:0:0"),
    "mouseControl": (SHOP+"check-kane-control.mp4", 37, 10, "crop=1280:720:0:0"),
    "gateBefore": (SHOP+"gate-kane-fail.mp4", 97.5, 10, "crop=1280:750:0:0"),
    "gateAfter": (SHOP+"gate-kane-pass.mp4", 102, 10, "crop=1280:750:0:0"),
    "retireShop": (SHOP+"retire-kane.mp4", 44.5, 13, "crop=1280:750:0:0"),
    "fail": (MASS+"before/recording.mp4", 90.5, 10, "crop=1280:720:0:0"),
    "pass": (MASS+"attempt-1/after/recording.mp4", 69, 13, "crop=1280:720:0:0"),
    "destination": (MASS+"attempt-1/after/recording.mp4", 85.8, 3, "crop=1280:720:0:0"),
    "mapFail": (OCEAN+"before/recording.mp4", 55, 5, "crop=850:460:0:0"),
    "mapMouse": (OCEAN+"control/recording.mp4", 24, 6, "crop=850:460:0:0"),
    "mapPass": (OCEAN+"attempt-1/after/recording.mp4", 40, 6, "crop=850:460:0:0"),
    "archive": ("proof/report-to-fix/user-clip.mp4", 0, 17, "null"),
    "form": ("proof/report-to-fix/browser.mp4", 3, 2.4, "crop=400:720:0:0"),
    "trust": ("launch/film/incoming/trust.mp4", 0, 8, "scale=1480:-2"),
    "checkTerm": (SHOP+"check.mp4", 0, 12, "crop=1520:648:36:86"),
    "gateTerm": (SHOP+"gate.mp4", 0, 11, "crop=1570:595:40:85"),
    "retireTerm": (SHOP+"retire.mp4", 0, 8, "crop=1390:550:48:90")
}

def track(name, file):
    rgb = np.asarray(Image.open(file)).astype(int)
    if name in ("pass", "fail"):
        col = rgb[:180,704]
        navy = (col[:,2] > 55) & (col[:,2] > col[:,0]+45) & (col[:,1] < 70)
        return int(np.flatnonzero(navy)[-1]+1)
    column = rgb[:720,542]
    green = (column[:,0]<57) & (column[:,1]>42) & (column[:,1]<76) & (column[:,1]-column[:,0]>9)
    rows = np.flatnonzero(green)
    for run in np.split(rows,np.where(np.diff(rows)>1)[0]+1):
        if 23<=len(run)<=34 and rgb[run[len(run)//2],516,0]>160:
            return int(run[0])
    raise ValueError(f"Search button missing in {file}")

def extract(item):
    name, (source, start, length, crop) = item
    folder = MEDIA/name
    folder.mkdir(exist_ok=True)
    filters = "fps=15,"+crop
    if name.endswith("Term"):
        filters += ",hue=s=0"
    subprocess.run(["ffmpeg","-y","-v","error","-ss",str(start),"-i",ROOT/source,"-t",str(length),"-an","-vf",filters,"-q:v","2",folder/"%04d.jpg"],check=True)
    frames = sorted(folder.glob("*.jpg"))
    tracked = ("shopBefore","shopAfter","gateBefore","gateAfter","retireShop","pass","fail")
    positions = [track(name,file) for file in frames] if name in tracked else []
    return name,len(frames),positions

with ThreadPoolExecutor(max_workers=3) as pool:
    clips = list(pool.map(extract,sources.items()))
(MEDIA/"clips.json").write_text(json.dumps({n:count for n,count,_ in clips}))
(MEDIA/"tracks.json").write_text(json.dumps({n:track for n,_,track in clips if track}))
