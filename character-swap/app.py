"""Web UI: python app.py, then open http://localhost:7860"""
import tempfile
from pathlib import Path

import gradio as gr

from charswap.pipeline import swap_character


def run(video, image, backend, seconds, prompt, wan_repo, progress=gr.Progress()):
    if not video or not image:
        raise gr.Error("Upload both a video and a character image.")
    logs = []
    out = Path(tempfile.mkdtemp()) / "swapped.mp4"
    opts = {"prompt": prompt or None} if backend == "cloud" else {"wan_repo": wan_repo or None}
    progress(0.1, desc="Working... this takes a few minutes")
    try:
        swap_character(video, image, out, backend=backend, max_seconds=seconds, log=logs.append, **opts)
    except Exception as e:
        raise gr.Error(str(e))
    return str(out), "\n".join(logs)


with gr.Blocks(title="Character Swap") as demo:
    gr.Markdown("# Character Swap\nReplace the person in a video with your character — same moves, same scene.")
    with gr.Row():
        video = gr.Video(label="Original video (2–30 s, one main person)")
        image = gr.Image(label="New character (full body)", type="filepath")
    with gr.Row():
        backend = gr.Radio(["cloud", "local"], value="cloud", label="Run on")
        seconds = gr.Slider(2, 30, value=10, step=1, label="Max seconds")
    prompt = gr.Textbox(label="Optional description (cloud)", placeholder="a cartoon fox dancing")
    wan_repo = gr.Textbox(label="Wan2.2 folder (local only)")
    btn = gr.Button("Swap character", variant="primary")
    result = gr.Video(label="Result")
    log = gr.Textbox(label="Log", lines=4)
    btn.click(run, [video, image, backend, seconds, prompt, wan_repo], [result, log])

if __name__ == "__main__":
    demo.launch()
