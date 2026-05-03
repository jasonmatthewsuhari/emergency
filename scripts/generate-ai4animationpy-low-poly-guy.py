from __future__ import annotations

import json
import math
from pathlib import Path

from ai4animation import AI4Animation, Time


FPS = 60
DURATION_SECONDS = 8
FRAME_COUNT = FPS * DURATION_SECONDS
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "public/generated/ai4animation-low-poly-guy.json"


class LowPolyWalkProgram:
    def __init__(self) -> None:
        self.frames: list[dict[str, float | list[float]]] = []

    def Update(self) -> None:
        t = Time.TotalTime
        orbit = t * 0.72
        phase = t * 8.4
        radius = 3.1
        stride = math.sin(phase)
        counter_stride = math.sin(phase + math.pi)
        bounce = 0.085 * abs(math.sin(phase))

        self.frames.append(
            {
                "time": round(t, 4),
                "root": [
                    round(math.cos(orbit) * radius, 4),
                    round(bounce, 4),
                    round(math.sin(orbit) * radius, 4),
                ],
                "yaw": round(-orbit + math.pi / 2.0, 4),
                "bodyTilt": round(0.06 * math.sin(phase + math.pi / 2.0), 4),
                "headTilt": round(0.09 * math.sin(phase * 0.5), 4),
                "leftArm": round(0.82 * counter_stride, 4),
                "rightArm": round(0.82 * stride, 4),
                "leftLeg": round(0.72 * stride, 4),
                "rightLeg": round(0.72 * counter_stride, 4),
                "leftKnee": round(0.34 + 0.32 * max(0.0, counter_stride), 4),
                "rightKnee": round(0.34 + 0.32 * max(0.0, stride), 4),
                "footRoll": round(0.24 * math.sin(phase), 4),
                "cheek": round(0.5 + 0.5 * math.sin(phase * 0.35), 4),
            }
        )


def main() -> None:
    Time.TotalTime = 0.0
    Time.DeltaTime = 0.0
    program = LowPolyWalkProgram()
    AI4Animation(program, mode=AI4Animation.Mode.MANUAL)

    for _ in range(FRAME_COUNT):
        AI4Animation.Update(1.0 / FPS)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "source": "AI4AnimationPy manual update loop",
                "fps": FPS,
                "durationSeconds": DURATION_SECONDS,
                "frames": program.frames,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(program.frames)} frames to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
