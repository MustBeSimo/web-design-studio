#!/usr/bin/env python3
"""Render the KERN hero as a coherent, seamless-loop camera move.

The whole frame moves as ONE integrated shot — the entire mechanism and its cast
shadow drift, breathe and sway together under a gently floating camera. There are
no isolated composited "moving centre" patches over a frozen plate, so the motion
never reads as pasted on: every pixel belongs to the same live beauty shot.

The camera path is built from a single sine/cosine cycle, so the last frame's
position and velocity exactly match the first — the loop is seamless with no
crossfade. The monochrome master is a desaturated grade of the exact colour
encode, so both website layers stay frame-matched by construction.

Note: a single 2-D still cannot reveal new faces of the object. A true turntable
(the mechanism itself rotating) needs either a 3-D model or an image-to-video
generation — see README. This renderer delivers the honest best from one plate.
"""
from pathlib import Path
from subprocess import Popen, run, PIPE
from math import sin, cos, tau, radians
from PIL import Image, ImageEnhance, ImageFilter

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "kern-calibration-unit.png"
COLOR = HERE / "kern-color.mp4"
MONO = HERE / "kern-mono.mp4"
OW, OH, FPS, FRAMES = 2560, 1440, 30, 350
DURATION = FRAMES / FPS

# Prepare the plate once: grade + sharpen so every resampled frame is crisp and consistent.
src = Image.open(SOURCE).convert("RGB")
src = ImageEnhance.Contrast(src).enhance(1.035)
src = ImageEnhance.Color(src).enhance(1.05)
src = src.filter(ImageFilter.UnsharpMask(radius=2.2, percent=90, threshold=2))
SW, SH = src.size
base_fit = max(OW / SW, OH / SH)          # cover the output frame from the plate
OCX, OCY = OW / 2.0, OH / 2.0
SCX, SCY = SW / 2.0, SH / 2.0

# Floating-camera path — one closed sine cycle → seamless loop (start == end, matching velocity).
ZOOM0, ZOOM_A = 1.09, 0.020               # breathe 1.07 <-> 1.11 (headroom hides translate/rotate)
DX_A = 0.008 * OW                         # gentle horizontal orbit
DY_A = 0.006 * OH                         # gentle vertical bob
ROT_A = 1.2                               # degrees of sway

cmd = [
    "ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
    "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-", "-an",
    "-vf", "gradfun=1.0:16,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-movflags", "+faststart", str(COLOR),
]
encoder = Popen(cmd, stdin=PIPE)
assert encoder.stdin is not None
stream = encoder.stdin

for i in range(FRAMES):
    a = tau * i / FRAMES
    theta = radians(ROT_A * sin(a))
    zoom = ZOOM0 + ZOOM_A * (-cos(a))     # min at loop start, max at half, back — smooth
    dx = DX_A * cos(a)
    dy = DY_A * sin(a)
    k = base_fit * zoom                    # total plate->frame scale
    ct, st = cos(theta) / k, sin(theta) / k
    # Inverse affine: output pixel (x,y) samples the plate at (a*x+b*y+c, d*x+e*y+f).
    ax, bx = ct, st
    dxc, ex = -st, ct
    c = SCX - (ax * (OCX + dx) + bx * (OCY + dy))
    f = SCY - (dxc * (OCX + dx) + ex * (OCY + dy))
    frame = src.transform((OW, OH), Image.AFFINE, (ax, bx, c, dxc, ex, f), resample=Image.BICUBIC)
    stream.write(frame.tobytes())

stream.close()
if encoder.wait() != 0:
    raise SystemExit("colour encode failed")

result = run([
    "ffmpeg", "-loglevel", "error", "-y", "-i", str(COLOR),
    "-vf", "hue=s=0,eq=contrast=1.06:brightness=-0.012,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-movflags", "+faststart", "-an", str(MONO),
])
if result.returncode:
    raise SystemExit("monochrome encode failed")

print(f"rendered {FRAMES} frames / {DURATION:.3f}s coherent camera move -> {COLOR.name}, {MONO.name}")
