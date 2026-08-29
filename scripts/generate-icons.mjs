import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const LAVANDA = [0x7c, 0x6b, 0xb0];
const PAPEL = [0xf6, 0xf4, 0xfb];
const BRANCO = [0xff, 0xff, 0xff];
const PRETO = [0x00, 0x00, 0x00];

const RI = 0.6; // raio interno do anel (externo = 1)
const BAR = 0.2; // meia-espessura do travessão
const GAP_END = (60 * Math.PI) / 180; // abertura do G: de 0° a 60°

function inMark(x, y) {
  const d = Math.hypot(x, y);
  if (d <= 1 && d >= RI) {
    let a = Math.atan2(y, x);
    if (a < 0) a += 2 * Math.PI;
    if (a > 0 && a < GAP_END) return false; // abertura
    return true;
  }
  return Math.abs(y) <= BAR && x >= 0.1 && d <= 1; // travessão, cortado pelo círculo externo
}

function draw(size, bg, fg, scale) {
  const png = new PNG({ width: size, height: size });
  const r = size * scale;
  const c = size / 2;
  const SS = 4; // supersampling para bordas suaves
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS - c) / r;
          const y = (c - (py + (sy + 0.5) / SS)) / r;
          if (inMark(x, y)) hits++;
        }
      }
      const cov = hits / (SS * SS);
      const i = (py * size + px) << 2;
      if (bg) {
        for (let k = 0; k < 3; k++) png.data[i + k] = Math.round(bg[k] + (fg[k] - bg[k]) * cov);
        png.data[i + 3] = 255;
      } else {
        for (let k = 0; k < 3; k++) png.data[i + k] = fg[k];
        png.data[i + 3] = Math.round(cov * 255);
      }
    }
  }
  return PNG.sync.write(png);
}

const out = (rel, buf) => {
  const p = path.join('assets/images', rel);
  fs.writeFileSync(p, buf);
  console.log(p, buf.length + 'b');
};

out('icon.png', draw(1024, LAVANDA, BRANCO, 0.3));
out('android-icon-background.png', draw(1024, LAVANDA, LAVANDA, 0.3));
out('android-icon-foreground.png', draw(1024, null, BRANCO, 0.24));
out('android-icon-monochrome.png', draw(1024, null, PRETO, 0.24));
out('splash-icon.png', draw(512, null, LAVANDA, 0.42));
out('favicon.png', draw(64, LAVANDA, BRANCO, 0.3));
