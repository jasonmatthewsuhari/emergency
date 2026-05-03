# AI4AnimationPy setup

AI4AnimationPy is a separate Python framework, so keep it as a sidecar checkout instead of mixing it into the Next.js app dependencies.

## Current fit for this machine

- Upstream requires Python 3.12+.
- This shell's default `python` is 3.10.11, but `uv` already has Python 3.12.9 installed.
- Conda is not on PATH here.
- The machine has an NVIDIA GeForce RTX 3050 Laptop GPU. `nvidia-smi` reports driver 591.86 and CUDA 13.1 support, so PyTorch CUDA 12.4 wheels should be usable.
- Upstream has no GitHub releases at the time of setup. Pinning the tested commit is safer than tracking `main`.

Inspected upstream commit:

```text
1cb1677110ce97ce78fba9135a1111afc9112a04
```

## Recommended local setup

From the repo root:

```powershell
.\scripts\setup-ai4animationpy.ps1
```

This clones `facebookresearch/ai4animationpy` into `external/ai4animationpy`, checks out the pinned commit, creates `external/ai4animationpy/.venv-ai4animationpy`, installs the CUDA-oriented dependencies, installs AI4AnimationPy editable, and runs a bounded manual-update smoke test.

For a CPU-only install:

```powershell
.\scripts\setup-ai4animationpy.ps1 -CpuOnly
```

To only clone and pin the upstream repo without installing dependencies:

```powershell
.\scripts\setup-ai4animationpy.ps1 -SkipInstall
```

## Manual verification

After install:

```powershell
external\ai4animationpy\.venv-ai4animationpy\Scripts\Activate.ps1
python external\ai4animationpy\Demos\Empty\Program.py
python external\ai4animationpy\Demos\Actor\Program.py
```

`Demos/Empty/Program.py` runs an endless headless loop, so stop it manually when used as a smoke test. `Demos/Actor/Program.py` opens a renderer window through `raylib`, so use it to verify the visual pipeline.

## Upstream references

- Official installation docs: https://facebookresearch.github.io/ai4animationpy/getting-started/installation/
- Upstream repository: https://github.com/facebookresearch/ai4animationpy
- Demo index: https://facebookresearch.github.io/ai4animationpy/tutorials/demos/
