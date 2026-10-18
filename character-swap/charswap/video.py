"""Small ffmpeg helpers: inspect, prepare, and finish videos."""
import json
import shutil
import subprocess
from pathlib import Path


def _need_ffmpeg():
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("ffmpeg is required. Install it: https://ffmpeg.org/download.html")


def probe(path):
    """Return duration (seconds), width, height, fps and whether it has audio."""
    _need_ffmpeg()
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    info = json.loads(out)
    video = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        raise ValueError(f"{path} has no video stream")
    num, den = video.get("r_frame_rate", "30/1").split("/")
    return {
        "duration": float(info["format"].get("duration", 0)),
        "width": int(video["width"]),
        "height": int(video["height"]),
        "fps": float(num) / float(den or 1),
        "has_audio": any(s["codec_type"] == "audio" for s in info["streams"]),
    }


def prepare(src, dst, start=0.0, max_seconds=None, max_side=1280):
    """Trim and downscale the input so the model gets a clip it can handle."""
    _need_ffmpeg()
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", str(start), "-i", str(src)]
    if max_seconds:
        cmd += ["-t", str(max_seconds)]
    # Keep aspect ratio, cap the longest side, force even dimensions for H.264.
    scale = (f"scale='if(gt(iw,ih),min({max_side},iw),-2)':'if(gt(iw,ih),-2,min({max_side},ih))',"
             "scale=trunc(iw/2)*2:trunc(ih/2)*2")
    cmd += ["-vf", scale, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(dst)]
    subprocess.run(cmd, check=True)
    return Path(dst)


def add_audio(video_no_audio, audio_source, dst):
    """Copy the original soundtrack onto the generated video (models output silent clips)."""
    _need_ffmpeg()
    if not probe(audio_source)["has_audio"]:
        shutil.copy(video_no_audio, dst)
        return Path(dst)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(video_no_audio), "-i", str(audio_source),
         "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-shortest", str(dst)],
        check=True,
    )
    return Path(dst)


def side_by_side(left, right, dst):
    """Original on the left, swapped on the right — handy for comparing motion."""
    _need_ffmpeg()
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(left), "-i", str(right), "-filter_complex",
         "[0:v]scale=-2:720,setsar=1[a];[1:v]scale=-2:720,setsar=1[b];[a][b]hstack=inputs=2[v]",
         "-map", "[v]", "-map", "1:a?", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-shortest", str(dst)],
        check=True,
    )
    return Path(dst)
