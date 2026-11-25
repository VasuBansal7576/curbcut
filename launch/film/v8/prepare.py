import json
import os
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LAUNCH = ROOT / "launch"
WORK = Path(os.environ["FILM_CACHE"]) / "media"
WORK.mkdir(parents=True, exist_ok=True)
PLATES = LAUNCH / "film/plates"
A2 = LAUNCH / "film/a2/plates"
MIST = np.array([232,228,245])
DAMSON = np.array([48,32,57])
ORANGE = np.array([255,120,74])

def pixels(file, crop=None):
    im = Image.open(file).convert("RGB")
    if crop:
        im = im.crop(crop)
    return np.asarray(im).astype(float)

def write(name, rgb):
    Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).save(WORK / (name+".png"), optimize=True)

def between(lo, hi, amount):
    return lo + np.clip(amount, 0, 1)[:,:,None]*(hi-lo)

def brand(name, file, crop=None):
    rgb = pixels(file, crop)
    light = rgb @ np.array([.2126,.7152,.0722])/255
    write(name, between(DAMSON, MIST, light))

def ink(name, data, alpha, color=DAMSON):
    rgb = np.empty_like(data)
    rgb[:] = color
    write(name, np.dstack([rgb, np.clip(alpha, 0, 1)*255]))

def nav(name, file, crop):
    data = pixels(file,crop)
    alpha = (data[:,:,0]-4)/242
    ink(name, data, alpha)

nav("nav",PLATES/"mass-on-10.png",(60,550,1514,683))
nav("menu",PLATES/"mass-on-10.png",(60,683,742,1603))
brand("wide",A2/"mass-before.jpg")
brand("switchOff", LAUNCH/"direction/v8/source/switch-off.png")
brand("switchOn", LAUNCH/"direction/v8/source/switch-on.png")
brand("report", PLATES/"owner-report.png",(68,35,1535,553))
for name, file, crop in [
    ("arrow","munich",(0,670,100,770)),("dots","meridiano",(284,130,332,178)),
    ("search","meridiano",(364,128,404,180))]:
    data=pixels(A2/(file+".jpg"),crop)
    alpha=(1-data[:,:,1]/(193 if name=="arrow" else 243))
    ink(name,data,(alpha-.10)/.78)
data=pixels(PLATES/"contrast-off.png",(2711,94,2993,200))
ink("details",data,(data[:,:,0]-88)/(242-88))
for name in ["foot","spring","cap"]:
    source=LAUNCH / ("direction/v8/source/tab/"+name+".webp")
    (WORK/(name+".webp")).write_bytes(source.read_bytes())

kane = "proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/"
clips = {
    "fail":(kane+"before/recording.mp4",79,10,"crop=1260:490:0:0"),
    "pass":(kane+"attempt-1/after/recording.mp4",82.9,7,"crop=1260:490:0:0"),
    "checkTerm":("launch/footage/check.mp4",0,12,"crop=1520:648:36:86"),
    "gateTerm":("launch/footage/gate.mp4",0,11,"crop=1570:595:40:85"),
    "retireTerm":("launch/footage/retire.mp4",0,8,"crop=1390:550:48:90"),
    "shopBefore":("launch/footage/check-kane-before.mp4",76,11,"crop=1280:750:0:0"),
    "shopAfter":("launch/footage/check-kane-after.mp4",87.5,10,"crop=1280:750:0:0"),
    "gateBefore":("launch/footage/gate-kane-fail.mp4",115,12,"crop=1280:750:0:0"),
    "gateAfter":("launch/footage/gate-kane-pass.mp4",114,12,"crop=1280:750:0:0"),
    "retireShop":("launch/footage/retire-kane.mp4",54,12,"crop=1280:750:0:0"),
    "trust":("launch/film/incoming/trust.mp4",0,8,"null"),
    "draft":("launch/film/incoming/shortcut.mp4",0,7,"null")
}
grade = "hue=s=0,format=gbrp,lutrgb=r='48+184*val/255':g='32+196*val/255':b='57+188*val/255'"
manifest = {}
for name,(file,at,length,crop) in clips.items():
    folder=WORK/name
    folder.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg","-y","-v","error","-ss",str(at),"-i",str(ROOT/file),"-t",str(length),"-an","-vf",f"fps=15,{crop},scale='min(1480,iw)':-2,{grade},format=yuvj420p","-q:v","2",str(folder/"%04d.jpg")],check=True)
    manifest[name]=len(list(folder.glob("*.jpg")))
(WORK/"clips.json").write_text(json.dumps(manifest))
