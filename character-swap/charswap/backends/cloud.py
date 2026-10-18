"""Cloud backend: runs Wan2.2-Animate (replace mode) on Replicate. No GPU needed.

Needs a Replicate account and the REPLICATE_API_TOKEN environment variable.
The model's input names are read from its live schema, so small API changes don't break this.
"""
import os
import urllib.request
from pathlib import Path

DEFAULT_MODEL = "wan-video/wan-2.2-animate-replace"


def _input_fields(model_ref):
    import replicate

    model = replicate.models.get(model_ref)
    schema = model.latest_version.openapi_schema
    return schema["components"]["schemas"]["Input"]["properties"]


def _pick(fields, words, avoid=()):
    """Find the input field whose name best matches, e.g. 'video' or 'character_image'."""
    for name in fields:
        low = name.lower()
        if all(w in low for w in words) and not any(a in low for a in avoid):
            return name
    return None


def run(video, character_image, output, prompt=None, resolution=None, seed=None,
        model_ref=DEFAULT_MODEL, log=print):
    try:
        import replicate
    except ImportError as e:
        raise RuntimeError("Install the cloud extras: pip install replicate") from e
    if not os.environ.get("REPLICATE_API_TOKEN"):
        raise RuntimeError("Set REPLICATE_API_TOKEN (get one at https://replicate.com/account/api-tokens)")

    fields = _input_fields(model_ref)
    video_key = _pick(fields, ["video"])
    image_key = _pick(fields, ["character"]) or _pick(fields, ["image"], avoid=["video"])
    if not video_key or not image_key:
        raise RuntimeError(f"Couldn't match inputs for {model_ref}. Fields: {list(fields)}")

    with open(video, "rb") as v, open(character_image, "rb") as img:
        inputs = {video_key: v, image_key: img}
        if prompt and "prompt" in fields:
            inputs["prompt"] = prompt
        if resolution and "resolution" in fields:
            inputs["resolution"] = resolution
        if seed is not None and "seed" in fields:
            inputs["seed"] = seed
        log(f"Uploading and running {model_ref} (this usually takes a few minutes)...")
        result = replicate.run(model_ref, input=inputs)

    if isinstance(result, (list, tuple)):
        result = result[0]
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    if hasattr(result, "read"):
        Path(output).write_bytes(result.read())
    else:  # older clients return a URL string
        urllib.request.urlretrieve(str(result), output)
    return Path(output)
