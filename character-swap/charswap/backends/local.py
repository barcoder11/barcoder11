"""Local backend: runs the official Wan2.2-Animate-14B code on your own NVIDIA GPU.

One-time setup (see README):
  git clone https://github.com/Wan-Video/Wan2.2 && pip install -r Wan2.2/requirements.txt
  huggingface-cli download Wan-AI/Wan2.2-Animate-14B --local-dir Wan2.2/Wan2.2-Animate-14B
Then pass --wan-repo path/to/Wan2.2 (or set WAN_REPO).
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def run(video, character_image, output, wan_repo=None, ckpt_dir=None, resolution=(1280, 720),
        relighting=True, log=print):
    repo = Path(wan_repo or os.environ.get("WAN_REPO", "")).expanduser()
    if not (repo / "generate.py").exists():
        raise RuntimeError("Point --wan-repo (or WAN_REPO) at a clone of https://github.com/Wan-Video/Wan2.2")
    ckpt = Path(ckpt_dir or repo / "Wan2.2-Animate-14B").expanduser().resolve()
    if not ckpt.exists():
        raise RuntimeError(f"Model weights not found at {ckpt}. Download Wan-AI/Wan2.2-Animate-14B there.")

    work = Path(tempfile.mkdtemp(prefix="charswap_"))
    processed = work / "process_results"
    py = sys.executable

    # Step 1: track the original person's pose, face and body mask in every frame.
    log("Step 1/2: tracking pose and masking the original character...")
    subprocess.run([
        py, "wan/modules/animate/preprocess/preprocess_data.py",
        "--ckpt_path", str(ckpt / "process_checkpoint"),
        "--video_path", str(Path(video).resolve()),
        "--refer_path", str(Path(character_image).resolve()),
        "--save_path", str(processed),
        "--resolution_area", str(resolution[0]), str(resolution[1]),
        "--iterations", "3", "--k", "7", "--w_len", "1", "--h_len", "1",
        "--replace_flag",
    ], cwd=repo, check=True)

    # Step 2: draw the new character into the scene, following the tracked motion.
    log("Step 2/2: generating the swapped video (slow: minutes per few seconds of video)...")
    cmd = [
        py, "generate.py", "--task", "animate-14B", "--ckpt_dir", str(ckpt),
        "--src_root_path", str(processed), "--refert_num", "1", "--replace_flag",
        "--save_file", str(work / "result.mp4"),
    ]
    if relighting:
        cmd.append("--use_relighting_lora")  # matches the new character to the scene's lighting
    subprocess.run(cmd, cwd=repo, check=True)

    result = work / "result.mp4"
    if not result.exists():
        found = sorted(work.rglob("*.mp4")) + sorted(repo.glob("*.mp4"), key=os.path.getmtime)
        if not found:
            raise RuntimeError("Wan finished but no output video was found")
        result = found[-1]
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(result), output)
    return Path(output)
