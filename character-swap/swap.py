#!/usr/bin/env python3
"""Swap the character in a video for one from an image, keeping the same motion.

Examples:
  python swap.py dance.mp4 robot.png                      # cloud (Replicate), no GPU needed
  python swap.py dance.mp4 robot.png --compare -o out.mp4
  python swap.py dance.mp4 robot.png --backend local --wan-repo ~/Wan2.2
"""
import argparse
import sys

from charswap.pipeline import swap_character


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video", help="original video with the person whose motion you want")
    p.add_argument("character", help="image of the new character (full body works best)")
    p.add_argument("-o", "--output", default="output/swapped.mp4")
    p.add_argument("--backend", choices=["cloud", "local"], default="cloud")
    p.add_argument("--start", type=float, default=0.0, help="start time in seconds")
    p.add_argument("--seconds", type=float, default=10.0, help="max clip length (2-30s)")
    p.add_argument("--no-audio", action="store_true", help="don't copy the original audio")
    p.add_argument("--compare", action="store_true", help="also save an original-vs-swapped video")
    p.add_argument("--prompt", help="(cloud) optional text hint, e.g. 'a silver robot dancing'")
    p.add_argument("--resolution", help="(cloud) e.g. 720, 580 or 480")
    p.add_argument("--seed", type=int, help="(cloud) fix for repeatable results")
    p.add_argument("--wan-repo", help="(local) path to your Wan2.2 clone")
    p.add_argument("--ckpt-dir", help="(local) path to Wan2.2-Animate-14B weights")
    p.add_argument("--no-relight", action="store_true", help="(local) skip lighting matching")
    a = p.parse_args(argv)

    if a.backend == "cloud":
        opts = {"prompt": a.prompt, "resolution": a.resolution, "seed": a.seed}
    else:
        opts = {"wan_repo": a.wan_repo, "ckpt_dir": a.ckpt_dir, "relighting": not a.no_relight}
    try:
        swap_character(a.video, a.character, a.output, backend=a.backend, start=a.start,
                       max_seconds=a.seconds, keep_audio=not a.no_audio, compare=a.compare, **opts)
    except Exception as e:  # show a clean message instead of a traceback
        print(f"Error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
