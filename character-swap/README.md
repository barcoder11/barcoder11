# Character Swap

Replace the person in a video with a different character (from one image). The new character
does the **same motion** in the **same scene**, and the original audio is kept.

It uses [Wan2.2-Animate](https://github.com/Wan-Video/Wan2.2) in *replace* mode: it tracks the
original person's body pose and face in every frame, masks them out, then draws your character
in their place following that motion.

## Quick start (cloud — no GPU needed)

```bash
pip install -r requirements.txt
export REPLICATE_API_TOKEN=r8_...        # https://replicate.com/account/api-tokens
python swap.py dance.mp4 my_character.png --compare
```

Output: `output/swapped.mp4` and `output/swapped_compare.mp4` (original vs swapped).
Cloud runs cost a small amount per video on Replicate.

Prefer clicking? `python app.py` and open http://localhost:7860.

## Run on your own GPU (free, needs ~24GB+ VRAM NVIDIA GPU)

```bash
git clone https://github.com/Wan-Video/Wan2.2 && pip install -r Wan2.2/requirements.txt
huggingface-cli download Wan-AI/Wan2.2-Animate-14B --local-dir Wan2.2/Wan2.2-Animate-14B
python swap.py dance.mp4 my_character.png --backend local --wan-repo Wan2.2
```

## Options

| Flag | Meaning |
|---|---|
| `-o out.mp4` | Output path |
| `--start 5 --seconds 8` | Use 8 s of the video starting at 0:05 (clips are 2–30 s) |
| `--compare` | Also save a side-by-side video |
| `--prompt "a silver robot"` | Optional text hint (cloud) |
| `--seed 42` | Repeatable results (cloud) |
| `--no-audio` | Don't copy the original sound |

## Tips for good results

- One main person, clearly visible, not heavily blocked by objects.
- Character image: full body, plain background, similar pose/proportions to the person in the video.
- Shorter clips (5–10 s) are faster and cheaper.

## Use responsibly

Only swap people who have agreed to it, and don't use this to impersonate real people or make
misleading videos. Label AI-generated videos when you share them.
