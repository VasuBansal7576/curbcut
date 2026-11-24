import json
import math
import os
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

LAUNCH = Path(__file__).resolve().parents[1]
WORK = Path(os.environ.get("FILM_CACHE", "/private/tmp/curbcut-v5-build"))
OUT = LAUNCH / "out/beats"


def jev_letter_heights(path, state):
    named = state in {"labels", "precision", "quiet"}
    with Image.open(path) as frame:
        pixels = np.asarray(frame.convert("RGB"))
    heights = []
    for top in (420, 530):
        red, green, blue = pixels[top:top+99, 292:611].transpose(2, 0, 1)
        if named:
            ink = (red > 185) & (green > 160) & (blue < 75)
        else:
            ink = (red > 180) & (green > 180) & (blue > 180)
        rows = np.flatnonzero(ink.sum(axis=1) >= 2)
        assert len(rows), f"No label in {path.name} at y={top}"
        height = int(rows[-1] - rows[0] + 1)
        assert height >= 34, f"{path.name} label at y={top} measures {height}px"
        heights.append(height)
    return heights


def main():
    OUT.mkdir(exist_ok=True)
    beats = json.loads((LAUNCH / "film/beats.json").read_text())
    cuts = json.loads((LAUNCH / "film/word-times.json").read_text())
    records = []
    for cut, file in [("master","curbcut-launch.mp4"),("teaser","curbcut-launch-15s.mp4")]:
        marks = []
        for shot in cuts[cut]:
            events = [b for b in beats if b["cut"] == cut and b["scene"] == shot["id"]]
            for i,b in enumerate(events):
                end = events[i+1]["local"] if i+1<len(events) else shot["frames"]/30
                frame = shot["frame"] + min(shot["frames"]-1,math.floor((end+b["local"])*15))
                marks.append(dict(cut=cut,scene=shot["id"],state=b["state"],word=b["word"],onset=b["wordStart"],frame=frame))
        target = WORK / ("beat-review-"+cut)
        target.mkdir(exist_ok=True)
        select = "+".join(f"eq(n\\,{b['frame']})" for b in marks)
        subprocess.run(["ffmpeg","-v","error","-y","-i",LAUNCH/file,"-vf","select="+select,"-fps_mode","vfr","-q:v","2",target/"%03d.jpg"],check=True)
        for i,b in enumerate(marks,1):
            name = f"{cut}-{i:02d}-{b['state']}.jpg"
            (target/f"{i:03d}.jpg").replace(OUT/name)
            if b["scene"] == "jev":
                b["button_label_ink_heights_px"] = jev_letter_heights(OUT/name, b["state"])
            records.append(dict(b,file=name))
    (OUT/"index.json").write_text(json.dumps(records,indent=2,ensure_ascii=False)+"\n")
    font = ImageFont.truetype(str(LAUNCH/"film/fonts/JetBrainsMono.ttf"),18)
    for start in range(0,len(records),6):
        page = Image.new("RGB",(1440,3*444),"#111214")
        draw = ImageDraw.Draw(page)
        for i,b in enumerate(records[start:start+6]):
            with Image.open(OUT/b["file"]) as im:
                assert im.size == (1920,1080)
                x,y = (i%2)*720,(i//2)*444
                page.paste(im.resize((720,405),Image.Resampling.LANCZOS),(x,y))
                draw.text((x+12,y+410),f"{b['frame']/30:.2f}s  {b['scene']}  /  {b['word']}",font=font,fill="#FFCE1F")
        page.save(WORK/f"review-beats-{start//6:02d}.jpg",quality=94)
    print(f"Extracted {len(records)} midpoint frames from the encoded cuts.")


if __name__ == "__main__":
    main()
