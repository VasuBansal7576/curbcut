import hashlib
import json
from pathlib import Path
import sys

from PIL import Image

PLATES = Path(__file__).resolve().parents[1] / "film/plates"
SELECTIONS = {
    "mass-off": [0, 5, 10, 11, 12], "mass-on": [10, 11, 12, 13],
    "csc-off": [8, 9], "csc-on": [9, 10, 11],
}


def export_frame(folder, group, index, step):
    raw = folder / group / step["file"]
    screenshot = Image.open(raw)
    assert screenshot.size == (5464, 3400)
    anchor = step["heading"] if step["key"] == "Enter" else step["trigger"]
    left = max(0, min(screenshot.width-3000, anchor[0]-360))
    top = max(0, min(screenshot.height-2100, anchor[1]-550))

    def relative(rect):
        if rect and rect[2] and rect[3]:
            return [rect[0]-left, rect[1]-top, *rect[2:]]
        return rect

    for field in ["heading", "trigger", "rect", "item", "menu"]:
        step[field] = relative(step[field])
    for label in step["letters"].values():
        if label:
            label["bounds"] = relative(label["bounds"])
    name = "mass-nav-home" if group == "mass-off" and index == 0 else f"{group}-{index}"
    filename = name + ".png"
    screenshot.crop((left, top, left+3000, top+2100)).save(PLATES/filename)
    return name, {
        **step, "file": filename, "capture": f"{group}/{raw.name}",
        "source": "Isolated Chromium with bundled extension", "enabled": group.endswith("-on"),
        "size": [3000, 2100], "captureSize": list(screenshot.size),
        "captureCrop": [left, top, 3000, 2100], "captureSha256": hashlib.sha256(raw.read_bytes()).hexdigest(),
    }


def main():
    folder = Path(sys.argv[1])
    catalog_file = PLATES / "index.json"
    catalog = json.loads(catalog_file.read_text())
    for group, selected in SELECTIONS.items():
        steps = json.loads((folder/group/"keys.json").read_text())
        for ordinal in selected:
            name, plate = export_frame(folder, group, ordinal, steps[ordinal])
            catalog[name] = plate
    catalog_file.write_text(json.dumps(catalog, indent=2, ensure_ascii=False)+"\n")


if __name__ == "__main__":
    main()
