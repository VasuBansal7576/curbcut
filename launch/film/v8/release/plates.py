import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MEDIA = Path(os.environ["FILM_CACHE"]) / "media"
KANE = "proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/"
REPORT = "proof/report-to-fix/"
clips = {
    "archiveMap": (REPORT+"user-clip.mp4", 0, 17, "null"),
    "reportForm": (REPORT+"browser.mp4", 3, 2.4, "crop=400:720:0:0"),
    "oceanFail": (KANE+"before/recording.mp4", 55, 5, "crop=900:600:0:0"),
    "oceanMouse": (KANE+"control/recording.mp4", 24, 6, "crop=900:600:0:0"),
    "oceanPass": (KANE+"attempt-1/after/recording.mp4", 40, 6, "crop=900:600:0:0")
}
manifest_path = MEDIA/"clips.json"
manifest = json.loads(manifest_path.read_text())
for name,(file,start,length,crop) in clips.items():
    folder = MEDIA/name
    folder.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(start),"-i",ROOT/file,"-t",str(length),"-an","-vf","fps=15,"+crop,"-q:v","2",folder/"%04d.jpg"],check=True)
    manifest[name] = len(list(folder.glob("*.jpg")))
manifest_path.write_text(json.dumps(manifest))
