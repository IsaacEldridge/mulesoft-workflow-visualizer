// Produce a "track changes" markdown document by line-diffing two versions of
// content. Inserted lines are wrapped in [+ ... +], removed lines in [- ... -].
// Unchanged lines are emitted as-is. This is intentionally a v1 — pure markdown
// so any reviewer can read it without Word/Google Docs.

function lcsTable(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }
  return dp;
}

// Returns an array of { type: 'equal'|'add'|'remove', text: string }
function diffLines(originalLines, editedLines) {
  const dp = lcsTable(originalLines, editedLines);
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < originalLines.length && j < editedLines.length) {
    if (originalLines[i] === editedLines[j]) {
      ops.push({ type: 'equal', text: originalLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'remove', text: originalLines[i] });
      i++;
    } else {
      ops.push({ type: 'add', text: editedLines[j] });
      j++;
    }
  }
  while (i < originalLines.length) ops.push({ type: 'remove', text: originalLines[i++] });
  while (j < editedLines.length) ops.push({ type: 'add', text: editedLines[j++] });
  return ops;
}

/**
 * Build a track-changes markdown document.
 * @param {string} original
 * @param {string} edited
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @returns {string}
 */
export function buildTrackChangesMarkdown(original, edited, opts = {}) {
  const { title = 'Track Changes' } = opts;
  const ops = diffLines(original.split('\n'), edited.split('\n'));

  let added = 0;
  let removed = 0;
  ops.forEach(op => {
    if (op.type === 'add') added++;
    else if (op.type === 'remove') removed++;
  });

  const header = `# ${title}\n\n` +
    `_Generated ${new Date().toISOString()}_\n\n` +
    `**Summary:** ${added} line(s) added, ${removed} line(s) removed.\n\n` +
    `Legend: \`[+ added line +]\` and \`[- removed line -]\`\n\n` +
    `---\n\n`;

  const body = ops.map(op => {
    if (op.type === 'equal') return op.text;
    if (op.type === 'add') return `[+ ${op.text} +]`;
    return `[- ${op.text} -]`;
  }).join('\n');

  return header + body + '\n';
}
