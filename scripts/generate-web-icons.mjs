import fs from 'node:fs';
import { PNG } from 'pngjs';

const PAPEL = [0xf6, 0xf4, 0xfb];
const src = PNG.sync.read(fs.readFileSync('assets/images/gabi_logo_2.png'));

function render(size) {
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / size));
      const sy = Math.min(src.height - 1, Math.floor((y * src.height) / size));
      const s = (sy * src.width + sx) << 2;
      const d = (y * size + x) << 2;
      const a = src.data[s + 3] / 255;
      for (let c = 0; c < 3; c++) {
        out.data[d + c] = Math.round(src.data[s + c] * a + PAPEL[c] * (1 - a));
      }
      out.data[d + 3] = 255;
    }
  }
  return PNG.sync.write(out);
}

for (const [file, size] of [
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/favicon.png', 48],
]) {
  fs.writeFileSync(file, render(size));
  console.log(file, size);
}
