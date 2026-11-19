"""Render the checked 8.2-1 answer from the same measured geometry as the lesson."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
G = json.loads((ROOT / "tools" / "sluice-8-2-1-geometry.json").read_text(encoding="utf-8"))
SCALE = 1.2
OFFSET = (28, 18)
W, H = 1280, 760
INK = "#354b55"
ANSWER = "#dd663c"
MUTED = "#8ca2a8"


def at(x: float, y: float) -> tuple[int, int]:
    return round(OFFSET[0] + x * SCALE), round(OFFSET[1] + y * SCALE)


def height_at(x: float) -> float:
    a, b, c, d = G["breaks"]
    low, high = G["floor"], G["crest"]
    if x <= a:
        return low
    if x < b:
        return low + (high - low) * (x - a) / (b - a)
    if x <= c:
        return high
    if x < d:
        return high - (high - low) * (x - c) / (d - c)
    return low


def line(draw: ImageDraw.ImageDraw, points, color=INK, width=3):
    draw.line([at(x, y) for x, y in points], fill=color, width=width, joint="curve")


def dashed(draw: ImageDraw.ImageDraw, a, b, color=INK, width=2, dash=10, gap=7):
    import math

    length = math.dist(a, b)
    if not length:
        return
    direction = ((b[0] - a[0]) / length, (b[1] - a[1]) / length)
    t = 0.0
    while t < length:
        end = min(length, t + dash)
        p = (a[0] + direction[0] * t, a[1] + direction[1] * t)
        q = (a[0] + direction[0] * end, a[1] + direction[1] * end)
        line(draw, [p, q], color, width)
        t += dash + gap


def font(size):
    for path in [r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


image = Image.new("RGB", (W, H), "white")
draw = ImageDraw.Draw(image)
W0, D, HEIGHT = G["length"], G["depth"], G["height"]
FX, FY, PY, SX = 70, 275, 335, 570
top = [(0, G["floor"]), *[(x, height_at(x)) for x in G["breaks"]], (W0, G["floor"])]

draw.text(at(FX, 48), "正面投影", font=font(21), fill=INK)
draw.text(at(FX, 305), "水平投影", font=font(21), fill=INK)

# Given elevation, including hidden floor shape and gate-slot edges.
draw.rectangle([at(FX, FY - HEIGHT), at(FX + W0, FY)], outline=INK, width=3)
for (x0, z0), (x1, z1) in zip(top, top[1:]):
    dashed(draw, (FX + x0, FY - z0), (FX + x1, FY - z1))
for x in G["slot"]:
    dashed(draw, (FX + x, FY - HEIGHT), (FX + x, FY - G["crest"]))

# Given plan and the lengthwise 1—1 cutting plane.
draw.rectangle([at(FX, PY), at(FX + W0, PY + D)], outline=INK, width=3)
_, notch_back, inner_back, inner_front, notch_front, _ = G["walls"]
slot_left, slot_right = G["slot"]
back = [(0, inner_back), (slot_left, inner_back), (slot_left, notch_back),
        (slot_right, notch_back), (slot_right, inner_back), (W0, inner_back)]
front = [(0, inner_front), (slot_left, inner_front), (slot_left, notch_front),
         (slot_right, notch_front), (slot_right, inner_front), (W0, inner_front)]
line(draw, [(FX + x, PY + y) for x, y in back], width=3)
line(draw, [(FX + x, PY + y) for x, y in front], width=3)
for x in G["breaks"]:
    line(draw, [(FX + x, PY + inner_back), (FX + x, PY + inner_front)], width=3)
for x0 in range(-38, W0 + 40, 27):
    dashed(draw, (FX + x0, PY + G["cutY"]), (FX + min(x0 + 20, W0 + 40), PY + G["cutY"]), MUTED, 2, 16, 7)
for x in [-34, W0 + 34]:
    line(draw, [(FX + x - 8, PY + G["cutY"] - 17), (FX + x - 8, PY + G["cutY"]), (FX + x + 8, PY + G["cutY"])], width=3)
    draw.text(at(FX + x - 3, PY + G["cutY"] - 36), "1", font=font(18), fill=INK)

# Section: uncut back wall stays white; only the actual concrete intersection is hatched.
section_points = [(SX + x, FY - z) for x, z in top]
section_polygon = [at(x, y) for x, y in section_points + [(SX + W0, FY), (SX, FY)]]
mask = Image.new("L", (W, H))
ImageDraw.Draw(mask).polygon(section_polygon, fill=255)
hatch = Image.new("RGBA", (W, H), (0, 0, 0, 0))
hatch_draw = ImageDraw.Draw(hatch)
for base in range(-H, W + H, 19):
    hatch_draw.line([(base, H), (base + H, 0)], fill=(133, 154, 158, 255), width=2)
hatch.putalpha(ImageChops.multiply(hatch.getchannel("A"), mask))
image = Image.alpha_composite(image.convert("RGBA"), hatch)
draw = ImageDraw.Draw(image)
line(draw, [(SX, FY - HEIGHT), (SX + W0, FY - HEIGHT)], width=3)
line(draw, [(SX, FY - HEIGHT), (SX, FY - G["floor"])], width=3)
line(draw, [(SX + W0, FY - HEIGHT), (SX + W0, FY - G["floor"])], width=3)
for x in G["slot"]:
    line(draw, [(SX + x, FY - HEIGHT), (SX + x, FY - G["crest"])], width=3)
line(draw, section_points, ANSWER, 5)
line(draw, [(SX, FY), (SX + W0, FY)], ANSWER, 5)
line(draw, [(SX, FY - G["floor"]), (SX, FY)], ANSWER, 5)
line(draw, [(SX + W0, FY - G["floor"]), (SX + W0, FY)], ANSWER, 5)
draw.text(at(SX + 110, 300), "1—1 剖面图", font=font(24), fill=INK)
line(draw, [(SX + 106, 328), (SX + 266, 328)], INK, 2)

output = ROOT / "answer-references" / "ex-8-2-1.png"
image.convert("RGB").save(output)
print(output)
