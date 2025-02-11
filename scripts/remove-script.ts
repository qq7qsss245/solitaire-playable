import path from "path";
import fs from "fs";

const distPath = path.join(__dirname, '..', 'dist','index.html');
if (fs.existsSync(distPath)) {
    console.log('Removing script tag from index.html');
    let html = fs.readFileSync(distPath, 'utf8');
    html = html.replace("<script><\\/script>", '<script/>');
    fs.writeFileSync(distPath, html);
}