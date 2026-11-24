from difflib import SequenceMatcher

import numpy as np
import onnx
import onnxruntime as rt
import soundfile as sf
from kokoro_onnx import Kokoro
from onnx import TensorProto, helper

from voice import MODEL, OUT, SPEED, VOICE, spoken


def timing_model():
    model = onnx.load(MODEL / "kokoro.onnx")
    model.graph.node.append(helper.make_node("Identity", ["/encoder/Gather_output_0"], ["duration"]))
    model.graph.output.append(helper.make_tensor_value_info("duration", TensorProto.INT64, [None]))
    options = rt.SessionOptions()
    options.intra_op_num_threads = 4
    path = OUT / "kokoro-timings.onnx"
    path.parent.mkdir(parents=True, exist_ok=True)
    onnx.save(model, path)
    session = rt.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
    return Kokoro.from_session(session, str(MODEL / "voices.bin"))


def align_line(engine, cue):
    text = cue["text"]
    style, _, batches = engine._prepare(spoken(text), VOICE, SPEED, "en-us", False, .25, .1)
    audio, phones = engine._create_batches(batches, style, SPEED, True)
    active = np.flatnonzero(abs(audio) > .004)
    head = max(0, active[0] - 960)
    length = len(audio[head:active[-1] + 1920])
    original = sf.info(OUT / cue["wav"])
    stretch = original.frames / length
    assert abs(1 - stretch) < .015, (text, stretch)
    actual = [(ch, p.start) for p in phones for ch in p.phoneme if ch.isalpha()]
    wanted = ""
    boundaries = []
    for word in text.split():
        boundaries.append(len(wanted))
        wanted += "".join(ch for ch in engine.tokenizer.phonemize(spoken(word), "en-us") if ch.isalpha())
    heard = "".join(ch for ch, _ in actual)
    anchors = {}
    matcher = SequenceMatcher(None, wanted, heard, autojunk=False)
    for a, b, n in matcher.get_matching_blocks():
        anchors.update((a+i, b+i) for i in range(n))
    assert matcher.ratio() > .77, (text, wanted, heard)
    anchors.setdefault(0, 0)
    anchors[len(wanted)] = len(actual)-1
    keys = sorted(anchors)
    result = []
    for word, offset in zip(text.split(), boundaries):
        index = round(np.interp(offset, keys, [anchors[k] for k in keys]))
        onset = max(0, actual[index][1] - head / 24000) * stretch
        result.append([word, round(cue["start"] + onset, 4)])
    return result
