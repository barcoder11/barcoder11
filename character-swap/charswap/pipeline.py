"""Ties it together: prepare clip -> AI swap -> put the original audio back."""
import tempfile
from pathlib import Path

from . import video as vid

IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def swap_character(video, character_image, output="output/swapped.mp4", backend="cloud",
                   start=0.0, max_seconds=10.0, keep_audio=True, compare=False, log=print, **opts):
    video, character_image, output = Path(video), Path(character_image), Path(output)
    if not video.exists():
        raise FileNotFoundError(video)
    if not character_image.exists():
        raise FileNotFoundError(character_image)
    if character_image.suffix.lower() not in IMAGE_TYPES:
        raise ValueError(f"Character must be an image ({', '.join(sorted(IMAGE_TYPES))})")

    info = vid.probe(video)
    log(f"Input: {info['width']}x{info['height']}, {info['duration']:.1f}s, {info['fps']:.0f} fps")
    if info["duration"] - start < 2:
        raise ValueError("Clip must be at least 2 seconds long")

    work = Path(tempfile.mkdtemp(prefix="charswap_"))
    clip = vid.prepare(video, work / "clip.mp4", start=start, max_seconds=max_seconds)
    raw = work / "raw.mp4"

    if backend == "cloud":
        from .backends import cloud
        cloud.run(clip, character_image, raw, log=log, **opts)
    elif backend == "local":
        from .backends import local
        local.run(clip, character_image, raw, log=log, **opts)
    else:
        raise ValueError("backend must be 'cloud' or 'local'")

    output.parent.mkdir(parents=True, exist_ok=True)
    if keep_audio:
        vid.add_audio(raw, clip, output)
    else:
        output.write_bytes(raw.read_bytes())
    log(f"Saved: {output}")

    if compare:
        cmp_path = output.with_name(output.stem + "_compare.mp4")
        vid.side_by_side(clip, output, cmp_path)
        log(f"Side-by-side: {cmp_path}")
    return output
