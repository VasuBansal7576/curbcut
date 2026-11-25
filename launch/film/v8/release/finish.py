import ast
import json
import math
import os
import subprocess
import textwrap
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
LAUNCH = HERE.parents[2]
ROOT = LAUNCH.parent
WORK = Path(os.environ["FILM_CACHE"])
SEG = WORK/"segments"
RATE = 48000
SPF = RATE//30
PREVIOUS = "66f12285"
ORIGINAL = "94189fb"
lines = json.loads((HERE/"lines.json").read_text())
timing = json.loads((HERE/"timing.json").read_text())
cuts = json.loads((WORK/"cuts.json").read_text())
launch = [s["id"] for s in cuts["launch"]]
developer = [s["id"] for s in cuts["developer"]]
added = [id for id in launch if id in lines]
teaser = ["mapSkip","mapReport","mapAgent","mapFixed","mapPopup","signoff"]

def historic(commit,file):
    return subprocess.check_output(["git","show",f"{commit}:launch/{file}"],cwd=ROOT)

def ff(*args):
    return subprocess.check_output(["ffmpeg","-v","error","-y",*map(str,args)])

def decoded(file):
    return np.frombuffer(ff("-i",file,"-map","0:a","-ar",RATE,"-ac",2,"-f","f32le","-"),dtype="<f4").reshape(-1,2)

def timecode(t):
    n=round(t*1000)
    return f"00:{n//60000:02}:{n//1000%60:02}.{n%1000:03}"

def read_cues(raw):
    def seconds(s):
        h,m,s=s.split(":")
        return int(h)*3600+int(m)*60+float(s)
    cues=[]
    for block in raw.strip().split("\n\n")[1:]:
        interval,text=block.split("\n",1)
        a,b=map(seconds,interval.split(" --> "))
        cues.append((a,b,text))
    return cues

def shift(cues,delta):
    return [(a+delta,b+delta,text) for a,b,text in cues]

def measured_mix(wav):
    stage = WORK/"insertion.wav"
    sf.write(stage,wav,RATE,subtype="FLOAT")
    log = subprocess.run(["ffmpeg","-hide_banner","-nostats","-i",stage,"-af","loudnorm=print_format=json","-f","null","-"],capture_output=True,text=True,check=True).stderr
    measure = json.loads(log[log.rfind("{"):log.rfind("}")+1])
    gain = min(-16-float(measure["input_i"]), -1.65-float(measure["input_tp"]))
    return (wav*10**(gain/20)).astype("float32")

tree=ast.parse(historic(ORIGINAL,"scripts/score.py"))
music=next(node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name=="music")
scope={"np":np,"math":math,"RATE":RATE}
exec(compile(ast.Module(body=[music],type_ignores=[]),"score.py","exec"),scope)
def mix(ids,phase):
    frames=sum(timing[id]["frames"] for id in ids)
    at=0
    base=scope["music"](math.ceil(phase+frames/30+1))[round(phase*RATE):][:frames*SPF]
    bed=base * (.027/np.sqrt(np.mean(base**2)))
    voice=np.zeros(len(bed))
    duck=np.full(len(bed),.9)
    cues=[]
    for id in ids:
        wav,rate=sf.read(WORK/"voice"/(id+".wav"))
        assert rate==RATE
        start=at*SPF+4800
        stop=start+len(wav)
        voice[start:stop]=wav
        lo=max(0,start-3840);hi=min(len(bed),stop+10080)
        part=np.interp(np.arange(lo,hi),[start-3840,start,stop,stop+10080],[.9,.47,.47,.9])
        duck[lo:hi]=np.minimum(duck[lo:hi],part)
        cues.append((start/RATE,stop/RATE,"\n".join(textwrap.wrap(lines[id],41))))
        at+=timing[id]["frames"]
    return measured_mix(voice[:,None]+bed*duck[:,None]),cues

def blend(left,right,left_at,source,src_at,count):
    weight=np.linspace(0,1,count)[:,None]
    right[left_at:left_at+count]=left*(1-weight)+source[src_at:src_at+count]*weight

src = WORK/"original.m4a"
src.write_bytes(historic(ORIGINAL,"audio/master.m4a"))
old=np.pad(decoded(src),((0,2*SPF),(0,0)))
source_cues=read_cues((LAUNCH/"direction/v8/problem-first/launch.vtt").read_text())
previous=WORK/"previous-demo.mp4"
if not previous.exists():previous.write_bytes(historic(PREVIOUS,"curbcut-demo.mp4"))
for id,at,frames in [("chapterA",75.5,2595),("chapterB",172.5,555)]:
    ff("-ss",at,"-i",previous,"-map","0:v","-frames:v",frames,"-an","-sn","-c:v","copy",SEG/(id+".mp4"))

ins,new_cues=mix(added,99.1)
tail=next(s["start"] for s in cuts["launch"] if s["id"]=="owner")
end=cuts["end"]
wave=np.concatenate([old[:2973*SPF],ins,old[3951*SPF:4354*SPF]])
assert len(wave)==end*SPF
count=1920
weight=np.linspace(0,1,count)[:,None]
wave[2973*SPF:2973*SPF+count]=old[2973*SPF:2973*SPF+count]*(1-weight)+ins[:count]*weight
start=tail*SPF-6240
blend(wave[start:tail*SPF].copy(),wave,start,old,3951*SPF-6240,6240)
caps=[c for c in source_cues if c[0]<99.1]+shift(new_cues,99.1)+shift([c for c in source_cues if c[0]>=105.2],tail/30-105.2)
short,short_caps=mix(teaser[:-1],99.1)
short=np.concatenate([short,old[4304*SPF:4354*SPF]])
assert len(short)==450*SPF
short_caps+=shift([source_cues[-1]],15-3559/30)
dev_wav,dev_caps=mix(developer,97)
old_demo=decoded(previous)
chapter=np.concatenate([old_demo[2265*SPF:5175*SPF],dev_wav,old_demo[5175*SPF:5730*SPF]])
demo=np.concatenate([wave,chapter])
prev_caps=read_cues(historic(PREVIOUS,"captions/demo.vtt").decode())
demo_caps=caps+shift([c for c in prev_caps if 75.5<=c[0]<172.5],end/30-75.5)+shift(dev_caps,end/30+97)+shift([c for c in prev_caps if c[0]>=172.5],end/30-75.5+len(dev_wav)/RATE)
for cut,name,stem,ids,sound,cc in [
    ("launch","curbcut-launch","master",launch,wave,caps),("teaser","curbcut-launch-15s","teaser",teaser,short,short_caps),
    ("demo","curbcut-demo","demo",launch+["chapterA","chapterReport"]+developer+["chapterB"],demo,demo_caps)]:
    if len(sound)>len(wave):assert len(sound)/RATE<300
    vtt=LAUNCH/"captions"/(cut+".vtt")
    for i,(a,b,text) in enumerate(cc):
        assert 0<=a<b<=len(sound)/RATE+.001 and (not i or a>=cc[i-1][1]-.001),(a,b,text)
    vtt.write_text("WEBVTT\n\n"+"\n\n".join(f"{timecode(a)} --> {timecode(b)}\n{text}" for a,b,text in cc)+"\n")
    if cut!="demo":(LAUNCH/"out"/("transcript.txt" if cut=="launch" else "teaser-transcript.txt")).write_text("\n".join(c[2].replace("\n"," ") for c in cc)+"\n")
    wav=WORK/(cut+".wav");sf.write(wav,sound,RATE,subtype="PCM_24")
    audio=LAUNCH/"audio"/(stem+".m4a")
    ff("-i",wav,"-c:a","aac","-b:a","256k","-movflags","+faststart",audio)
    playlist=WORK/(cut+".txt")
    playlist.write_text("".join(f"file '{SEG/(id+'.mp4')}'\n" for id in ids))
    ff("-f","concat","-safe","0","-i",playlist,"-i",audio,"-i",vtt,"-map","0:v","-map","1:a","-map","2:s",
       "-c","copy","-bsf:v","setts=pts=N*1000:dts=N*1000:duration=1000:time_base=1/30000",
       "-video_track_timescale",30000,"-c:s","mov_text","-metadata:s:s:0","language=eng","-disposition:s:0","0","-movflags","+faststart",LAUNCH/(name+".mp4"))
    print(name,len(sound)/RATE,len(cc),flush=True)
