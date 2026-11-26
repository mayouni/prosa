#!/usr/bin/env python3
"""voice-parity : compares the Prosa court's affirmative rule (LACK_LISTED, styles/ayouni/ayouni.proz) with the house gate,
check_public.py voice, file by file.

    python tools/parity/voice-parity.py <file-or-folder>... [--gate path/to/check_public.py]

For each .html and .md file it counts the gate's phrase matches on the words a reader reads, and the court's LACK_LISTED
findings. It prints the files on which the two counts differ and the totals. The two read a page differently by design: the
gate reads every tag's text as one line, the court reads titles, paragraphs and list items and skips navigation menus.
"""
import importlib.util, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
gate_path = sys.argv[sys.argv.index("--gate") + 1] if "--gate" in sys.argv else "D:/GitHub/ayouni/tools/check_public.py"
if "--gate" in sys.argv:
    args.remove(gate_path)
spec = importlib.util.spec_from_file_location("check_public", gate_path)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

files = []
for a in args:
    p = Path(a)
    files += sorted([f for f in p.rglob("*") if f.suffix in (".html", ".md")]) if p.is_dir() else [p]
node = r"""
const P = require('./tools/prosa/prosa.js'); const { load, contract } = require('./tools/prosa/cli.js'); const fs = require('fs');
const L = load(['styles/ayouni/ayouni.proz']); const ix = P.index(L.decls); const out = {};
for (const f of JSON.parse(fs.readFileSync(0, 'utf8'))) {
  const doc = P.read(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''), f); let n = 0;
  for (const r of ['lack_listed', 'manque_liste']) n += P.judgeRule(ix[r], doc.blocks, 'en', contract, {}, true).length;
  out[f] = n;
}
process.stdout.write(JSON.stringify(out));
"""
r = subprocess.run(["node", "-e", node], input=json.dumps([str(f) for f in files]), capture_output=True, text=True, cwd=ROOT, encoding="utf-8")
if r.returncode:
    print(r.stderr); sys.exit(2)
court = json.loads(r.stdout)
same = both_zero = 0; tg = tc = 0
for f in files:
    text = gate.voice_text(f.read_text(encoding="utf-8", errors="replace"), "html" if f.suffix == ".html" else "md")
    g = sum(len(rx.findall(text)) for rx in gate.VOICE_RE.values()); c = court[str(f)]
    tg += g; tc += c
    if g == c:
        same += 1; both_zero += (g == 0)
    else:
        print(f"  {f}: gate {g}, court {c}")
print(f"{same} of {len(files)} files agree ({both_zero} with no finding on either side); gate total {tg}, court total {tc}")
