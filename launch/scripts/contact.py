from pathlib import Path
import json
import math
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

LAUNCH = Path(__file__).resolve().parents[1]
WORK = Path(os.environ["FILM_CACHE"])
DEST = Path(os.environ.get("FILM_OUTPUT", LAUNCH))


def contacts():
    rows = []
    cuts = json.loads((LAUNCH/"film/word-times.json").read_text())
    font = ImageFont.truetype(str(LAUNCH/"film/fonts/JetBrainsMono.ttf"), 16)
    for cut, movie in [("master", "curbcut-launch.mp4"), ("teaser", "curbcut-launch-15s.mp4")]:
        folder = WORK/("half-second-"+cut)
        folder.mkdir(exist_ok=True)
        subprocess.run(["ffmpeg","-v","error","-y","-i",DEST/movie,"-vf",r"select=not(mod(n\,15)),scale=960:540:flags=lanczos","-fps_mode","vfr","-q:v","2",folder/"%04d.jpg"],check=True)
        count = math.ceil(sum(s["frames"] for s in cuts[cut])/15)
        for i in range(count):
            rows.append((folder/f"{i+1:04d}.jpg",f"{cut}   {i//120}:{(i//2)%60:02d}.{5*(i%2)}"))
    def sheet(subset, columns, width, path):
        height = width*9//16
        contact = Image.new("RGB",(width*columns,(height+26)*math.ceil(len(subset)/columns)),"#202020")
        draw = ImageDraw.Draw(contact)
        for j,(file, label) in enumerate(subset):
            x,y = (j%columns)*width,(j//columns)*(height+26)
            with Image.open(file) as frame:
                contact.paste(frame.resize((width,height),Image.Resampling.LANCZOS),(x,y))
            draw.text((x+8,y+height+3),label,font=font,fill="white")
        contact.save(path)
    (DEST/"out").mkdir(exist_ok=True)
    sheet(rows,5,320,DEST/"out/contact.png")
    for i in range(0,len(rows),12):
        sheet(rows[i:i+12],3,510,WORK/f"inspection-{i//12:02d}.jpg")
    return len(rows)


if __name__ == "__main__":
    print(contacts(),"decoded half-second frames")
