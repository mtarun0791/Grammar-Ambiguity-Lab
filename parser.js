class GrammarParser {
  constructor(grammarRules, options = {}) {
    this.caseSensitive = options.caseSensitive !== false;
    this.nonTerminals = new Set();
    this.terminals = new Set();
    this.epsilonSymbols = new Set(['ε', 'epsilon', '""', '@']);
    this.rules = this.parseRules(grammarRules);
    this.startSymbol = Object.keys(this.rules)[0];
    this.memo = new Map();
    Object.values(this.rules).forEach(prods => {
      prods.forEach(prod => {
        prod.forEach(s => {
          if (!this.nonTerminals.has(s) && !this.isEpsilon(s, false)) this.terminals.add(s);
        });
      });
    });
  }
  parseRules(ruleString) {
    const rules = {};
    const lines = ruleString.split('\n').filter(line => line.trim());
    lines.forEach(line => {
      const parts = line.split('->');
      if (parts.length < 2) return;
      const lhs = parts[0].trim();
      if (lhs) this.nonTerminals.add(lhs);
    });
    lines.forEach(line => {
      const parts = line.split('->');
      if (parts.length < 2) return;
      const lhs = parts[0].trim();
      const rhsPart = parts[1].trim();
      if (!lhs || !rhsPart) return;
      const productions = rhsPart.split('|').map(p => this.tokenizeRHS(p.trim()));
      if (!rules[lhs]) rules[lhs] = [];
      rules[lhs].push(...productions);
    });
    return rules;
  }
  tokenizeRHS(rhs) {
    if (rhs === "" || rhs === "ε" || rhs === "epsilon" || rhs === "@" || rhs === 'E' || rhs === 'e') {
      if (!this.nonTerminals.has(rhs)) return ["ε"];
    }
    if (rhs.includes(' ')) return rhs.split(/\s+/).filter(s => s);
    const symbols = [];
    let i = 0;
    const sortedNTs = Array.from(this.nonTerminals).sort((a, b) => b.length - a.length);
    while (i < rhs.length) {
      let matched = false;
      for (const nt of sortedNTs) {
        if (rhs.startsWith(nt, i)) {
          symbols.push(nt);
          i += nt.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        let nextNT = -1;
        for (let j = i + 1; j < rhs.length; j++) {
          for (const nt of sortedNTs) {
            if (rhs.startsWith(nt, j)) {
              nextNT = j;
              break;
            }
          }
          if (nextNT !== -1) break;
        }
        if (nextNT === -1) {
          symbols.push(rhs.substring(i));
          break;
        } else {
          symbols.push(rhs.substring(i, nextNT));
          i = nextNT;
        }
      }
    }
    return symbols;
  }
  isEpsilon(symbol, isNT) {
    return this.epsilonSymbols.has(symbol) || (!isNT && (symbol === 'E' || symbol === 'e'));
  }
  reset() { this.memo.clear(); }
  getParses(symbol, tokens, start, end, depth = 0) {
    const key = `${symbol}-${start}-${end}`;
    if (this.memo.has(key)) return this.memo.get(key);
    if (depth > 60) return [];
    const results = [];
    const length = end - start;
    const isNT = this.nonTerminals.has(symbol);
    if (this.isEpsilon(symbol, isNT)) return length === 0 ? [{ type: 'epsilon', value: 'ε' }] : [];
    if (!isNT) {
      if (length === 1) {
        const token = tokens[start];
        if (this.caseSensitive ? token === symbol : token.toLowerCase() === symbol.toLowerCase()) return [{ type: 'terminal', value: symbol }];
      }
      return [];
    }
    const productions = this.rules[symbol] || [];
    for (const prod of productions) {
      if (prod.length === 1 && this.isEpsilon(prod[0], false)) {
        if (length === 0) results.push({ type: 'non-terminal', symbol, children: [{ type: 'epsilon', value: 'ε' }] });
        continue;
      }
      this.matchProduction(symbol, prod, tokens, start, end, depth + 1).forEach(children => {
        results.push({ type: 'non-terminal', symbol, children });
      });
    }
    this.memo.set(key, results);
    return results;
  }
  matchProduction(parent, prod, tokens, start, end, depth) {
    if (prod.length === 0) return start === end ? [[]] : [];
    const first = prod[0], rest = prod.slice(1), matches = [];
    for (let split = start; split <= end; split++) {
      if (rest.length > 0 && split === end && this.matchProduction(parent, rest, tokens, split, end, depth).length === 0) continue;
      if (rest.length === 0 && first === parent && start === split) continue;
      const fParses = this.getParses(first, tokens, start, split, depth);
      if (fParses.length === 0) continue;
      const rParses = this.matchProduction(parent, rest, tokens, split, end, depth);
      if (rParses.length === 0) continue;
      for (const f of fParses) for (const r of rParses) matches.push([f, ...r]);
    }
    return matches;
  }
  findAmbiguousString(maxLen = 6) {
    const symbols = Array.from(this.terminals);
    if (symbols.length === 0) return null;
    let queue = symbols.map(s => [s]);
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.length > maxLen) break;
      this.reset();
      if (this.getParses(this.startSymbol, cur, 0, cur.length).length > 1) return cur.join(' ');
      if (cur.length < maxLen) for (const s of symbols) queue.push([...cur, s]);
    }
    return null;
  }
}
if (typeof module !== 'undefined') module.exports = GrammarParser;
