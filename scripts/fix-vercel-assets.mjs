import fs from 'node:fs';
import path from 'node:path';

const FROM = 'assets/node_modules/';
const TO = 'assets/vendor/';
const dir = 'dist';

const src = path.join(dir, FROM);
if (!fs.existsSync(src)) {
  console.log(`nada a fazer: ${src} não existe`);
  process.exit(0);
}
fs.renameSync(src, path.join(dir, TO));

let touched = 0;
for (const file of fs.globSync(`${dir}/**/*.{js,html,json,css,map}`)) {
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes(FROM)) continue;
  fs.writeFileSync(file, before.replaceAll(FROM, TO));
  touched++;
}
console.log(`${FROM} -> ${TO} (${touched} arquivo(s) reescrito(s))`);

const link = '.vercel/project.json';
if (fs.existsSync(link)) {
  fs.mkdirSync(path.join(dir, '.vercel'), { recursive: true });
  fs.copyFileSync(link, path.join(dir, '.vercel/project.json'));
  console.log(`vínculo restaurado: ${JSON.parse(fs.readFileSync(link, 'utf8')).projectName}`);
} else {
  console.warn('AVISO: .vercel/project.json ausente — rode `npx vercel link --project gabi-project-mobile --yes`');
}
