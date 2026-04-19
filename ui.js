const presets = {
  expression: { grammar: "E -> E + E\nE -> E * E\nE -> id", string: "id + id * id", desc: "Ambiguity in operator precedence: (id + id) * id vs id + (id * id)." },
  dangling: { grammar: "S -> i S\nS -> i S e S\nS -> a", string: "i i a e a", desc: "The 'Dangling Else' problem. Does 'else' belong to the first or second 'if'?" },
  binary: { grammar: "S -> S S\nS -> 0\nS -> 1", string: "010", desc: "Binary string with multiple partition possibilities." }
};
document.getElementById('simulate-btn').addEventListener('click', () => simulate());
document.getElementById('find-ambiguity-btn').addEventListener('click', findAmbiguity);
function loadPreset(name) {
  const p = presets[name];
  if (p) {
    document.getElementById('grammar-input').value = p.grammar;
    document.getElementById('string-input').value = p.string;
    simulate(p.desc);
  }
}
function simulate(cDesc = null) {
  const gText = document.getElementById('grammar-input').value, sText = document.getElementById('string-input').value, cS = document.getElementById('case-sensitive-toggle').checked;
  let tokens = sText.includes(' ') ? sText.trim().split(/\s+/) : sText.split('');
  tokens = tokens.filter(t => t);
  if (!gText) return alert("Please provide a grammar.");
  const parser = new GrammarParser(gText, { caseSensitive: cS }), rSec = document.getElementById('results-section'), tCont = document.getElementById('tree-container'), sBar = document.getElementById('status-bar');
  rSec.classList.remove('hidden');
  tCont.innerHTML = '';
  const tInfo = document.createElement('div');
  tInfo.className = 'token-preview';
  tInfo.innerHTML = `Parsing: [ ${tokens.map(t => `<span class="node terminal">${t}</span>`).join(' ')} ]`;
  tCont.appendChild(tInfo);
  const parses = parser.getParses(parser.startSymbol, tokens, 0, tokens.length);
  if (parses.length === 0) {
    sBar.className = 'status-bar status-ambiguous';
    sBar.innerHTML = `❌ No derivation for "<code>${sText}</code>".`;
    const hints = runDiagnostics(parser, tokens, sText, cS);
    if (hints.length > 0) {
      const hBox = document.createElement('div');
      hBox.className = 'explanation-card';
      hBox.innerHTML = `<strong>Grammar Tips:</strong><ul>${hints.map(h => `<li>${h}</li>`).join('')}</ul>`;
      tCont.appendChild(hBox);
    }
  } else {
    const isAmb = parses.length > 1;
    sBar.className = `status-bar ${isAmb ? 'status-ambiguous' : 'status-unambiguous'}`;
    sBar.innerHTML = isAmb ? `⚠️ <strong>Ambiguous!</strong> ${parses.length} trees found.` : `✅ <strong>Unambiguous.</strong> 1 tree found.`;
    if (isAmb || cDesc) {
      const dEl = document.createElement('div');
      dEl.className = 'explanation-card';
      dEl.innerHTML = `<p>${cDesc || "Multiple structural paths detected."}</p>`;
      tCont.appendChild(dEl);
    }
    const w = document.createElement('div');
    w.className = 'tree-container';
    parses.forEach((t, i) => {
      const v = document.createElement('div');
      v.className = 'tree-view';
      v.innerHTML = `<h4>Tree #${i + 1}</h4>`;
      const r = document.createElement('div');
      r.className = 'tree';
      r.appendChild(generateTreeHTML(t));
      v.appendChild(r);
      w.appendChild(v);
    });
    tCont.appendChild(w);
  }
  rSec.scrollIntoView({ behavior: 'smooth' });
}
function runDiagnostics(p, t, s, cS) {
  const h = [];
  const uNT = Array.from(p.terminals).filter(v => v === v.toUpperCase() && v.length === 1 && !['+', '*', '-', '/', '(', ')', '^'].includes(v));
  if (uNT.length > 0) h.push(`Symbol <strong>${uNT[0]}</strong> might be a missing non-terminal.`);
  if (cS) {
    const tp = new GrammarParser(document.getElementById('grammar-input').value, { caseSensitive: false });
    if (tp.getParses(tp.startSymbol, t, 0, t.length).length > 0) h.push(`Try disabling <strong>Case Sensitive</strong>.`);
  }
  return h;
}
function findAmbiguity() {
  const g = document.getElementById('grammar-input').value, cS = document.getElementById('case-sensitive-toggle').checked;
  if (!g) return alert("Provide grammar first.");
  const p = new GrammarParser(g, { caseSensitive: cS }), b = document.getElementById('find-ambiguity-btn'), o = b.innerText;
  b.innerText = "Searching...";
  b.disabled = true;
  setTimeout(() => {
    const a = p.findAmbiguousString(7);
    b.innerText = o;
    b.disabled = false;
    if (a) {
      document.getElementById('string-input').value = a;
      simulate("Found an ambiguous string!");
    } else alert("No ambiguous strings found up to length 7.");
  }, 50);
}
function generateTreeHTML(node) {
  const li = document.createElement('li');
  const d = document.createElement('div');
  d.className = `node ${node.type}`;
  d.textContent = node.type === 'non-terminal' ? node.symbol : (node.type === 'epsilon' ? 'ε' : node.value);
  li.appendChild(d);
  if (node.children && node.children.length > 0) {
    const ul = document.createElement('ul');
    node.children.forEach(c => ul.appendChild(generateTreeHTML(c)));
    li.appendChild(ul);
  }
  return li;
}
