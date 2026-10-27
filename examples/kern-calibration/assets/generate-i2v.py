#!/usr/bin/env python3
"""Generate the KERN hero as a REAL image-to-video via fal.ai (Seedance 2.0), then
encode it scrub-optimised for the scroll-scrubbed hero.

The page drives the video's currentTime from scroll position, so instead of an
autoplaying loop we want ONE clip whose time maps to the scroll journey. Seedance
2.0 animates the still into a genuine dolly-in with the gears and tourbillon
turning; we then re-encode with a short keyframe interval (GOP 6) so seeking to an
arbitrary time while scrolling stays smooth. The mono base and colour scan on the
page are two <video> elements pointing at this one file (base desaturated in CSS),
so they share a decode-time and never drift.

Usage:
    export FAL_KEY=<id:secret>
    python3 generate-i2v.py

Requires: Pillow, ffmpeg, network access to fal.ai. Costs a few cents/clip.
"""
import base64, io, json, os, subprocess, tempfile, time, urllib.request, urllib.error
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "kern-calibration-unit.png"
COLOR = HERE / "kern-color.mp4"
POSTER = HERE / "kern-poster.jpg"

FAL_KEY = os.environ.get("FAL_KEY")
assert FAL_KEY, "set FAL_KEY=<id:secret> in the environment"
AUTH = {"Authorization": "Key " + FAL_KEY, "Content-Type": "application/json"}

PROMPT = ("Cinematic macro shot of a floating skeleton watch movement. The exposed brass gears, "
          "escapement wheel and central tourbillon cage rotate continuously, slowly, smoothly and "
          "precisely on their own axes. The outer case and framing keep their exact shape; only the "
          "internal mechanism turns as the camera performs a slow cinematic dolly-in. Soft studio "
          "lighting, polished metal reflections, shallow depth of field, photorealistic, ultra "
          "detailed, floating on a clean soft grey backdrop. No text, no watermark, no logo.")

# fal endpoint ids for Seedance have NO 'fal-ai/' prefix. No negative_prompt in this schema.
MODELS = ["bytedance/seedance-2.0/image-to-video", "bytedance/seedance/v1/pro/image-to-video"]
PAYLOADS = [
    {"resolution": "1080p", "duration": "12", "aspect_ratio": "16:9", "generate_audio": False},
    {"resolution": "1080p", "duration": "10", "aspect_ratio": "16:9", "generate_audio": False},
    {"resolution": "1080p", "duration": "5"},
]


def call(url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    return json.load(urllib.request.urlopen(
        urllib.request.Request(url, data=data, headers=AUTH, method="POST" if body else "GET"), timeout=120))


def generate(raw_path):
    img = Image.open(SOURCE).convert("RGB"); img.thumbnail((1536, 1536))
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=94)
    image_url = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    sub = None
    for model in MODELS:
        for extra in PAYLOADS:
            try:
                print("submit", model, extra)
                sub = call("https://queue.fal.run/" + model, {"prompt": PROMPT, "image_url": image_url, **extra}); break
            except urllib.error.HTTPError as e:
                print(" ", model, "->", e.code, e.read().decode()[:150])
        if sub:
            break
    assert sub, "no Seedance model/payload accepted"
    final = None
    deadline = time.time() + 560
    while time.time() < deadline:
        st = call(sub["status_url"])
        if st.get("status") == "COMPLETED":
            final = st; break
        if st.get("status") in ("FAILED", "ERROR"):
            raise SystemExit("fal generation failed: " + json.dumps(st)[:300])
        time.sleep(7)
    assert final, "timed out waiting for fal"
    # fal can return a mismatched response_url for nested model paths; derive it from the status_url.
    res = None
    for ru in [final.get("response_url"), sub["status_url"].rsplit("/status", 1)[0]]:
        try:
            res = call(ru); break
        except urllib.error.HTTPError:
            pass
    assert res, "could not fetch result"
    url = (res.get("video") or {}).get("url") or (res.get("videos") or [{}])[0].get("url")
    assert url, "no video url: " + json.dumps(res)[:300]
    urllib.request.urlretrieve(url, raw_path)
    print("generated ->", raw_path)


def encode(raw_path):
    # GOP 6 = a keyframe every 0.25s so scroll-driven currentTime seeks stay smooth.
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw_path,
                    "-vf", "scale=1920:1080:flags=lanczos,cas=0.25,format=yuv420p",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "21",
                    "-g", "6", "-keyint_min", "6", "-sc_threshold", "0",
                    "-movflags", "+faststart", str(COLOR)], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(COLOR),
                    "-frames:v", "1", "-q:v", "3", str(POSTER)], check=True)
    print("wrote", COLOR.name, POSTER.name)


if __name__ == "__main__":
    with tempfile.TemporaryDirectory() as tmp:
        raw = str(Path(tmp) / "seedance-raw.mp4")
        generate(raw)
        encode(raw)
