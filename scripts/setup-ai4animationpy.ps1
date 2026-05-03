param(
    [string]$Destination = "external/ai4animationpy",
    [string]$PythonVersion = "3.12.9",
    [string]$Commit = "1cb1677110ce97ce78fba9135a1111afc9112a04",
    [switch]$SkipInstall,
    [switch]$CpuOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found on PATH."
    }
}

Require-Command git
Require-Command uv

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Target = Join-Path $RepoRoot $Destination
$Venv = Join-Path $Target ".venv-ai4animationpy"

if (-not (Test-Path $Target)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
    git clone https://github.com/facebookresearch/ai4animationpy.git $Target
}

$dirty = git -C $Target status --porcelain
if ($dirty) {
    throw "AI4AnimationPy checkout has local changes. Commit/stash them before changing commits."
}

git -C $Target fetch --depth 1 origin $Commit
git -C $Target checkout --detach $Commit

if ($SkipInstall) {
    Write-Host "Cloned AI4AnimationPy at $Target and checked out $Commit."
    exit 0
}

uv venv --python $PythonVersion $Venv

$Python = Join-Path $Venv "Scripts/python.exe"
if (-not (Test-Path $Python)) {
    throw "Expected venv Python at $Python."
}

if ($CpuOnly) {
    uv pip install --python $Python torch torchvision torchaudio
    uv pip install --python $Python onnxruntime
}
else {
    uv pip install --python $Python msvc-runtime==14.40.33807
    uv pip install --python $Python torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
    uv pip install --python $Python nvidia-cudnn-cu12==9.3.0.75 nvidia-cuda-runtime-cu12==12.5.82 nvidia-cufft-cu12==11.2.3.61
    uv pip install --python $Python onnxruntime-gpu==1.19.0
}

uv pip install --python $Python raylib numpy scipy matplotlib scikit-learn einops pygltflib==1.16.5 pyscreenrec==0.6 tqdm pyyaml onnx==1.19.1
uv pip install --python $Python -e $Target --no-deps

& $Python -c "import torch, onnxruntime as ort, ai4animation; from ai4animation import AI4Animation; AI4Animation(type('Program', (), {'Update': lambda self: None})(), mode=AI4Animation.Mode.MANUAL); AI4Animation.Update(1.0 / 60.0); print('torch', torch.__version__, 'cuda', torch.cuda.is_available()); print('onnxruntime', ort.__version__)"

Write-Host "AI4AnimationPy setup complete."
Write-Host "Activate with: $Venv\Scripts\Activate.ps1"
Write-Host "Run renderer demo with: $Python $Target\Demos\Actor\Program.py"
