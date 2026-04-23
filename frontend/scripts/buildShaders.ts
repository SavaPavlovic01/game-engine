import fs from 'fs';
import path from 'path';

const shaderDir = 'src/shaders';
const outFile = 'src/generated/shaders.ts';
const outDir = path.dirname(outFile);

fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(shaderDir);

let output = '';

for (const file of files) {
    if (!file.endsWith('.wgsl')) continue;

    const name = path.basename(file, '.wgsl');
    const code = fs.readFileSync(path.join(shaderDir, file), 'utf8');

    output += `export const ${name} = ${JSON.stringify(code)};\n`;
}

fs.writeFileSync(outFile, output);

console.log('Shaders built');
