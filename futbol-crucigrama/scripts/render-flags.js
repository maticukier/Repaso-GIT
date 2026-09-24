// Genera src/data/flags.ts con las banderas de flag-icons (MIT) como PNG embebidos.
// Uso:
//   npm pack flag-icons@7 && tar xzf flag-icons-*.tgz
//   echo "ar br de gb-eng ..." > codes.txt
//   node scripts/render-flags.js package/flags/4x3 codes.txt src/data/flags.ts
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
(async () => {
  const [dir, codesFile, out] = process.argv.slice(2);
  const codes = fs.readFileSync(codesFile, 'utf8').trim().split(/\s+/);
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  const entries = [];
  for (const code of codes) {
    const svg = fs.readFileSync(`${dir}/${code}.svg`, 'utf8');
    await p.setContent(`<body style="margin:0"><div id="f" style="width:48px;height:36px;overflow:hidden">${svg.replace('<svg', '<svg width="48" height="36" preserveAspectRatio="none"')}</div></body>`);
    const png = await p.locator('#f').screenshot({ type: 'png' });
    entries.push(`  '${code}': 'data:image/png;base64,${png.toString('base64')}',`);
  }
  fs.writeFileSync(out, `// Banderas generadas desde el paquete flag-icons (MIT, github.com/lipis/flag-icons)\n// con scripts/render-flags.js. No editar a mano.\nexport const FLAGS: Record<string, string> = {\n${entries.join('\n')}\n};\n`);
  console.log(codes.length, 'banderas', fs.statSync(out).size, 'bytes');
  await b.close();
})();
