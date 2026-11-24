# Contact sheet: tile a site's screenshots into one image for quick review.  python3 tools/sheet.py <dir> <prefix> <out.png> [cols] [width]
import sys, glob
from PIL import Image
d, prefix, out = sys.argv[1:4]; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4; w = int(sys.argv[5]) if len(sys.argv) > 5 else 480
files = sorted(f for f in glob.glob(f"{d}/{prefix}-*.png") if '-load-' not in f) 
ims = [Image.open(f).convert('RGB') for f in files]
ims = [im.resize((w, int(im.height * w / im.width))) for im in ims]
h = max(im.height for im in ims); rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 6), rows * (h + 6)), 'white')
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
sheet.save(out); print(out, sheet.size)
