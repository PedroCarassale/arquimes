from collections import Counter
from pathlib import Path
import sys

from PIL import Image


source = Path(sys.argv[1])
output_dir = Path(sys.argv[2])
output_dir.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert("RGBA")
pixels = list(image.get_flattened_data())
ink_mask = [red < 128 and blue > 128 and alpha > 0 for red, _, blue, alpha in pixels]

variants = {
    "arquimedes-archimedes-yellow-on-black.png": ((243, 164, 75, 255), (9, 9, 9, 255)),
    "arquimedes-archimedes-white-on-black.png": ((255, 255, 255, 255), (0, 0, 0, 255)),
    "arquimedes-archimedes-black-on-white.png": ((0, 0, 0, 255), (255, 255, 255, 255)),
}

print(f"source={image.size} ink={sum(ink_mask)} background={len(ink_mask) - sum(ink_mask)}")
for filename, (ink, background) in variants.items():
    output = Image.new("RGBA", image.size)
    output.putdata([ink if is_ink else background for is_ink in ink_mask])
    output_path = output_dir / filename
    output.save(output_path, optimize=True)
    print(filename, output_path.stat().st_size, Counter(output.get_flattened_data()))
