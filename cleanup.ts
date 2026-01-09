import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const srcDir = path.join(__dirname, 'src');
if (fs.existsSync(srcDir)) {
    const allFiles = walk(srcDir);

    allFiles.forEach(file => {
        if (file.endsWith('.js') || file.endsWith('.js.map')) {
            const base = file.replace(/\.js(\.map)?$/, '');
            const tsFile = base + '.ts';
            const vueFile = base;
            
            if (fs.existsSync(tsFile) || (fs.existsSync(vueFile) && vueFile.endsWith('.vue'))) {
                console.log(`Deleting legacy JS file: ${file}`);
                fs.unlinkSync(file);
            }
        }
    });
}
