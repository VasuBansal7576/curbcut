from pathlib import Path
import json
import math
import os
import subprocess

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WORK = Path(os.environ.get("FILM_CACHE", "/private/tmp/curbcut-v5-build"))
OUT = ROOT / "out/stills/navigation"
SCENES = ["mass-off", "mass-on", "mass-proof", "csc", "teaser-before", "teaser-after"]


def ink_height(image, region, white_on_blue=False):
    ratio = image.width / 1920
    x, y, w, h = [n * ratio for n in region]
    box = (math.floor(x), math.floor(y), math.ceil(x+w), math.ceil(y+h))
    assert 0 <= box[0] < box[2] <= image.width and 0 <= box[1] < box[3] <= image.height, box
    pixels = np.asarray(image.crop(box).convert("RGB"), dtype=np.int16)
    background = np.median(pixels.reshape(-1,3), axis=0)
    foreground = np.max(np.abs(pixels-background), axis=2) > 60
    if white_on_blue:
        red, green, blue = pixels.transpose(2,0,1)
        foreground = (red > 80) & (green > 125) & (blue > 145) & (blue > red-30)
    rows = np.flatnonzero(foreground.sum(axis=1) >= max(1, round(w*.012)))
    assert len(rows), box
    bands = np.split(rows, np.flatnonzero(np.diff(rows)>1)+1)
    return int(max(len(band) for band in bands))


def check_journey(mark):
    expected = {
        "aboutOff": ("Tab", "About", False), "closed": ("ArrowDown", "About", False),
        "invisible": ("Tab", "Board Business", False), "opened": ("ArrowDown", "About", True),
        "link": ("Tab", "The DHE", True), "cscOpen": ("ArrowDown", "ABOUT", True),
        "meity": ("Tab", "About MeitY", True),
    }
    if mark["state"] in expected:
        assert (mark["key"], mark["focus"], mark["menuVisible"]) == expected[mark["state"]]
    if mark["state"] in {"arrived", "reached", "ministry"}:
        assert mark["key"] == "Enter"
        endpoint = "/meity" if mark["state"] == "ministry" else "/about/aboutdhe.asp"
        assert mark["url"].endswith(endpoint)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    phone = OUT / "phone"
    phone.mkdir(exist_ok=True)
    beats = json.loads((ROOT / "film/beats.json").read_text())
    labels = {(b["scene"], b["state"]): b["word"] for b in beats}
    records = []
    for cut, movie in [("master","curbcut-launch.mp4"),("teaser","curbcut-launch-15s.mp4")]:
        frames = []
        for scene in SCENES:
            if scene.startswith("teaser-") != (cut=="teaser"):
                continue
            for mark in json.loads((WORK/(scene+"-nav.json")).read_text()):
                word = labels.get((scene,mark["state"]), mark["state"])
                frames.append(dict(mark,scene=scene,cut=cut,word=word))
        frames.sort(key=lambda m:m["frame"])
        assert len({m["frame"] for m in frames})==len(frames)
        choose = "+".join(f"eq(n\\,{m['frame']})" for m in frames)
        temp = WORK / ("navigation-" + cut)
        temp.mkdir(exist_ok=True)
        subprocess.run(["ffmpeg","-v","error","-y","-i",ROOT/movie,"-vf","select="+choose,
                        "-fps_mode","vfr",temp/"%03d.png"],check=True)
        for i,m in enumerate(frames,1):
            check_journey(m)
            filename=f"{m['scene']}-{m['state']}.png"
            (temp/f"{i:03d}.png").replace(OUT/filename)
            full=Image.open(OUT/filename)
            small=full.resize((640,360),Image.Resampling.LANCZOS)
            small.save(phone/filename)
            for label in [*m["lettering"], *([m["kane"]] if "kane" in m else [])]:
                white_on_blue=label is m.get("kane") and label["text"] in {"ABOUT","About","The DHE"}
                label["height_1920"]=ink_height(full,label["region"],white_on_blue)
                label["height_640"]=ink_height(small,label["region"],white_on_blue)
            assert m["zoom"] <= 1.25 and all(l["height_1920"]>=36 for l in m["lettering"]),m
            if "kane" in m:
                assert m["kane"]["scale"]==1.25
            m["file"]=filename
            records.append(m)
    (ROOT/"out/navigation.json").write_text(json.dumps(records,indent=2,ensure_ascii=False)+"\n")
    text = "# Navigation beat stills\n\nMeasured text heights are ink pixels in the decoded film and the 640-pixel-wide still. The measurement uses each link’s captured DOM text bounds and counts the tallest contiguous band of contrasting glyph rows. The live page and the Kane inset are measured separately.\n"
    for cut in ["master","teaser"]:
        text += f"\n## {cut.capitalize()}\n\n| Time | Shot and spoken beat | Live text height, 1920 / 640 | Kane inset, 1920 / 640 | Stills |\n|---:|---|---|---|---|\n"
        for m in records:
            if m['cut']!=cut:
                continue
            def display(label):
                return f"{label['text']} {label['height_1920']} / {label['height_640']} px"
            heights=", ".join(display(l) for l in m['lettering'])
            evidence=display(m['kane']) if 'kane' in m else '—'
            f=m['file']; word=m['word'].replace('check-','Inspection at ')
            text+=f"| {m['frame']/30:.3f} s | {m['scene']} · {word} | {heights} | {evidence} | [1920]({f}) · [640](phone/{f}) |\n"
    (OUT/"README.md").write_text(text)
    print("Measured",len(records),"decoded navigation stills at both sizes.")


if __name__ == "__main__":
    main()
