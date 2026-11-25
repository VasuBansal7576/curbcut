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
Image.open(A2/"mass-before.jpg").save(WORK/"wide.png")
brand("switchOff", LAUNCH/"direction/v8/source/switch-off.png")
brand("switchOn", LAUNCH/"direction/v8/source/switch-on.png")
brand("sharedFix", PLATES/"popup-proof-and-report.png",(101,904,1857,1956))
brand("recordingLinks", PLATES/"popup-proof-and-report.png",(168,1847,1284,1964))
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
    "mouseControl":("launch/footage/check-kane-control.mp4",37,10,"crop=1280:720:0:0"),
    "destination":(kane+"attempt-1/after/recording.mp4",85.8,3,"crop=1280:720:0:0"),
    "fail":(kane+"before/recording.mp4",90.5,10,"crop=1280:720:0:0"),
    "pass":(kane+"attempt-1/after/recording.mp4",69,13,"crop=1280:720:0:0"),
    "checkTerm":("launch/footage/check.mp4",0,12,"crop=1520:648:36:86"),
    "gateTerm":("launch/footage/gate.mp4",0,11,"crop=1570:595:40:85"),
    "retireTerm":("launch/footage/retire.mp4",0,8,"crop=1390:550:48:90"),
    "shopIntro":("launch/footage/check-kane-after.mp4",54.5,12,"crop=1280:720:0:0"),
    "shopBefore":("launch/footage/check-kane-before.mp4",68,10,"crop=1280:750:0:0"),
    "shopAfter":("launch/footage/check-kane-after.mp4",84.5,12,"crop=1280:750:0:0"),
    "gateBefore":("launch/footage/gate-kane-fail.mp4",97.5,10,"crop=1280:750:0:0"),
    "gateAfter":("launch/footage/gate-kane-pass.mp4",102,10,"crop=1280:750:0:0"),
    "retireShop":("launch/footage/retire-kane.mp4",44.5,13,"crop=1280:750:0:0"),
    "trust":("launch/film/incoming/trust.mp4",0,8,"null"),
    "draft":("launch/film/incoming/shortcut.mp4",0,7,"null")
}
grade = "hue=s=0,format=gbrp,lutrgb=r='48+184*val/255':g='32+196*val/255':b='57+188*val/255'"
def search_position(frame):
    rgb = np.asarray(Image.open(frame))
    column = rgb[:720,542].astype(int)
    green = (column[:,0]<57) & (column[:,1]>42) & (column[:,1]<76) & (column[:,1]-column[:,0]>9)
    indices=np.flatnonzero(green)
    runs=np.split(indices,np.where(np.diff(indices)>1)[0]+1)
    for run in runs:
        if 23<=len(run)<=34 and rgb[run[len(run)//2],516,0]>160:
            return int(run[0])
    raise ValueError(f"Search button missing in {frame}")

def colour_verdicts(name, frames):
    regions = {
        "checkTerm":[(158,136,224,165,ORANGE,150),(172,319,240,353,[255]*3,218),(287,461,358,497,[255]*3,218)],
        "gateTerm":[(104,64,202,98,ORANGE,225),(373,64,469,98,ORANGE,225),(104,341,200,381,[255]*3,225)],
        "retireTerm":[(286,393,358,427,[255]*3,215)]
    }
    for frame in frames:
        rgb=np.array(Image.open(frame).convert("RGB"))
        base=rgb[9,9].astype(float)
        for x,y,r,b,colour,maximum in regions[name]:
            block=rgb[y:b,x:r]
            coverage=np.clip((block[:,:,0].astype(float)-base[0]-4)/(maximum-base[0]-4),0,1)
            block[:]=between(base,np.array(colour),coverage)
        Image.fromarray(rgb).save(frame,quality=98,subsampling=0)

manifest = {}
tracks = {}
for name,(file,at,length,crop) in clips.items():
    folder=WORK/name
    folder.mkdir(exist_ok=True)
    for previous in folder.glob("*.jpg"):
        previous.unlink()
    filters=[ "fps=15", crop, "scale='min(1480,iw)':-2" ]
    if name.endswith("Term"):
        filters.append(grade)
    filters.append("format=yuvj420p")
    subprocess.run(["ffmpeg","-y","-v","error","-ss",str(at),"-i",str(ROOT/file),"-t",str(length),"-an","-vf",",".join(filters),"-q:v","2",str(folder/"%04d.jpg")],check=True)
    frames=sorted(folder.glob("*.jpg"))
    manifest[name]=len(frames)
    if name.endswith("Term"):
        colour_verdicts(name,frames)
    if name.startswith(("shop","gateBefore","gateAfter","retireShop")):
        tracks[name]=[search_position(frame) for frame in frames]
    if name in ("fail","pass"):
        tracks[name]=[]
        for frame in frames:
            col=np.asarray(Image.open(frame))[:180,704].astype(int)
            navy=(col[:,2]>55)&(col[:,2]>col[:,0]+45)&(col[:,1]<70)
            rows=np.flatnonzero(navy)
            tracks[name].append(int(rows[-1])+1)
(WORK/"clips.json").write_text(json.dumps(manifest))
(WORK/"tracks.json").write_text(json.dumps(tracks))
