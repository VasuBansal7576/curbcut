import difflib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LAUNCH = HERE.parents[1]
WORK = Path(os.environ["FILM_CACHE"])

def ff(*args, capture=False):
    return subprocess.run(["ffmpeg","-y","-hide_banner","-nostats",*map(str,args)],check=True,stdout=subprocess.PIPE if capture else subprocess.DEVNULL,stderr=subprocess.PIPE).stderr.decode()

def normalize(source, out):
    settings = "loudnorm=I=-16:TP=-1.5:LRA=8"
    log = ff("-i",source,"-af",settings+":print_format=json","-f","null","-",capture=True)
    stats=json.loads(log[log.rfind("{"):log.rfind("}")+1])
    opts=":".join(f"measured_{key}={stats['input_'+key.lower()]}" for key in ["I","TP","LRA","thresh"])
    ff("-i",source,"-af",settings+":"+opts+":offset="+stats["target_offset"]+":linear=true","-ar","48000","-c:a","pcm_s24le",out)

def stamp(s):
    n=round(s*1000)
    return f"{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02}.{n%1000:03}"

def subtitles(words, end):
    groups=[]
    current=[]
    for i,(word,at) in enumerate(words):
        current.append((word,at))
        end_of_text=i==len(words)-1
        boundary=words[i+1][1] if not end_of_text else end
        joined=" ".join(w for w,_ in current)
        strong=word.endswith((".","?","!")) and boundary-current[0][1]>=1.1
        long=len(joined)>61 and (word.endswith(",") or len(joined)>76)
        if not (strong or long or end_of_text):
            continue
        groups.append((current,boundary))
        current=[]
    if len(groups)>1 and groups[-1][1]-groups[-1][0][0][1]<1.1:
        tail,finish=groups.pop()
        previous,_=groups.pop()
        groups.append((previous+tail,finish))
    result=[]
    for group,finish in groups:
        copy=[w for w,_ in group]
        caption=" ".join(copy)
        if len(caption)>43:
            def score(i):
                first=" ".join(copy[:i])
                last=" ".join(copy[i:])
                return abs(len(first)-len(last)) + 3*max(0,max(len(first),len(last))-43) - 6*first.endswith((",","?","!","."))
            split=min(range(1,len(copy)),key=score)
            caption=" ".join(copy[:split])+"\n"+" ".join(copy[split:])
        result.append([group[0][1],finish,caption])
    return result

def norm(w):
    return re.sub("[^a-z0-9]","",w.lower()).replace("cane","kane").replace("thirteen","13").replace("fifteen","15")

def match(line, asr, begin, end):
    words=line.split()
    heard=[(r["text"].strip(),r["offsets"]["from"]/1000) for r in asr if r["text"].strip() and begin-.14<=r["offsets"]["from"]/1000<end]
    sequence=difflib.SequenceMatcher(None,[norm(w) for w in words],[norm(w) for w,_ in heard],autojunk=False)
    anchors={0:begin,len(words):end}
    for i,j,n in sequence.get_matching_blocks():
        for k in range(n):
            anchors[i+k]=max(begin,heard[j+k][1])
    keys=sorted(anchors)
    result=[]
    for a,b in zip(keys,keys[1:]):
        for i in range(a,b):
            result.append((words[i],anchors[a]+(anchors[b]-anchors[a])*(i-a)/(b-a)))
    return result

def write_vtt(name, cues):
    text="WEBVTT\n\n"+"\n\n".join(f"{stamp(a)} --> {stamp(b)}\n{s}" for a,b,s in cues)+"\n"
    (LAUNCH/"captions"/(name+".vtt")).write_text(text)

audio=LAUNCH/"audio"
if "--mux-only" not in sys.argv:
    launch=[]
    for s in json.loads((LAUNCH/"film/word-times.json").read_text())["master"]:
        start=s["frame"]/30
        for c in s["cues"]:
            launch+=subtitles([(w,start+at) for w,at in c["words"]],start+c["end"])
    teaser=[(a,b,s) for a,b,s in launch if b<=8.5]+[(a-60.5,b-60.5,s) for a,b,s in launch if a>=69]
    demo=launch.copy()
    asr=json.loads((WORK/"demo-words.json").read_text())["transcription"]
    for scene in json.loads((HERE/"chapter-timing.json").read_text()):
        for c in scene["cues"]:
            begin=scene["start"]+c["start"]
            end=scene["start"]+c["end"]
            words=match(c["text"],asr,begin,end)
            demo.extend((a+75.5,b+75.5,s) for a,b,s in subtitles(words,end))
    for n,c in [("launch",launch),("demo",demo),("teaser",teaser)]:
        write_vtt(n,c)
    normalize(WORK/"chapter.wav",WORK/"chapter-normalized.wav")
    ff("-i",audio/"master.m4a","-i",WORK/"chapter-normalized.wav","-filter_complex","[0:a]atrim=end=75.5,asetpts=PTS-STARTPTS[a];[a][1:a]concat=n=2:v=0:a=1[out]","-map","[out]","-c:a","aac","-b:a","256k",audio/"demo.m4a")
    ff("-i",audio/"master.m4a","-filter_complex","[0:a]atrim=0:8.5,asetpts=PTS-STARTPTS[a];[0:a]atrim=69:75.5,asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1[out]","-map","[out]","-c:a","aac","-b:a","256k",audio/"teaser.m4a")
for name, filename, sound in [("launch","curbcut-launch","master"),("teaser","curbcut-launch-15s","teaser"),("demo","curbcut-demo","demo")]:
    ff("-f","concat","-safe","0","-i",WORK/(name+".txt"),"-i",audio/(sound+".m4a"),"-i",LAUNCH/"captions"/(name+".vtt"),"-map","0:v","-map","1:a","-map","2:s","-c","copy","-bsf:v","setts=pts=N*1000:dts=N*1000:duration=1000:time_base=1/30000","-video_track_timescale","30000","-c:s","mov_text","-metadata:s:s:0","language=eng","-disposition:s:0","0","-movflags","+faststart",LAUNCH/(filename+".mp4"))
