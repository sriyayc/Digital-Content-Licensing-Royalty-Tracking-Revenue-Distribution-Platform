// Splits a .sql file into executable statements.
// Understands DELIMITER directives (as used by the mysql CLI / Workbench),
// quoted strings, backtick identifiers and -- / # / /* */ comments.
export function splitSql(text) {
  const statements = [];
  let delimiter = ';';
  let buf = '';
  let i = 0;
  let atLineStart = true;

  while (i < text.length) {
    if (atLineStart) {
      const rest = text.slice(i);
      const m = rest.match(/^[ \t]*DELIMITER[ \t]+(\S+)[ \t]*(\r?\n|$)/i);
      if (m) {
        if (buf.trim()) statements.push(buf.trim());
        buf = '';
        delimiter = m[1];
        i += m[0].length;
        continue;
      }
    }
    const ch = text[i];
    atLineStart = false;

    if (ch === '\n') { buf += ch; i++; atLineStart = true; continue; }

    // comments
    if ((ch === '-' && text[i + 1] === '-' && /\s/.test(text[i + 2] ?? ' ')) || ch === '#') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }

    // quoted strings / identifiers
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === '\\' && ch !== '`') { j += 2; continue; }
        if (text[j] === ch) {
          if (text[j + 1] === ch) { j += 2; continue; }
          break;
        }
        j++;
      }
      buf += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    if (text.startsWith(delimiter, i)) {
      if (buf.trim()) statements.push(buf.trim());
      buf = '';
      i += delimiter.length;
      continue;
    }

    buf += ch;
    i++;
  }
  if (buf.trim()) statements.push(buf.trim());
  return statements;
}
