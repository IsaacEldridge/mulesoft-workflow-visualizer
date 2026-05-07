// Apply selected quality-check suggestions to content client-side.
//
// Each suggestion has:
//   { id, title, rationale, locator, replacement, kind }
//
// Application strategy by kind:
//   replace  -> replace first verbatim occurrence of locator with replacement
//   insert   -> insert replacement immediately after first occurrence of locator
//   remove   -> remove first occurrence of locator
//   rewrite  -> same as replace; tolerated as a synonym
//   note     -> not auto-applicable; always reported as skipped
//
// If a locator is empty or not found, the suggestion is skipped with a reason.
// Returns { updatedContent, applied, skipped } so the editor can render a report.

export function applySuggestions(content, suggestions) {
  let updatedContent = content;
  const applied = [];
  const skipped = [];

  for (const s of suggestions) {
    const kind = s.kind || 'replace';

    if (kind === 'note') {
      skipped.push({ ...s, reason: 'Note-only — no automatic edit possible.' });
      continue;
    }

    const locator = (s.locator || '').trim();
    if (!locator) {
      skipped.push({ ...s, reason: 'No locator provided — cannot find a target in the content.' });
      continue;
    }

    const idx = updatedContent.indexOf(locator);
    if (idx === -1) {
      skipped.push({ ...s, reason: 'Locator not found verbatim in current content (may have already been edited).' });
      continue;
    }

    const before = updatedContent.slice(0, idx);
    const after = updatedContent.slice(idx + locator.length);
    const replacement = s.replacement ?? '';

    if (kind === 'replace' || kind === 'rewrite') {
      updatedContent = before + replacement + after;
    } else if (kind === 'insert') {
      updatedContent = before + locator + replacement + after;
    } else if (kind === 'remove') {
      updatedContent = before + after;
    } else {
      skipped.push({ ...s, reason: `Unknown kind "${kind}".` });
      continue;
    }

    applied.push({ ...s });
  }

  return { updatedContent, applied, skipped };
}

/**
 * Render an "Apply Report" markdown summary suitable for inline display.
 */
export function buildApplyReport(applied, skipped) {
  const lines = [];
  lines.push(`## Apply Suggestions Report`);
  lines.push('');
  lines.push(`**Applied:** ${applied.length}  ·  **Skipped:** ${skipped.length}`);
  lines.push('');
  if (applied.length) {
    lines.push(`### ✅ Applied`);
    applied.forEach((s, i) => {
      lines.push(`${i + 1}. **${s.title}** — ${s.rationale || ''}`);
    });
    lines.push('');
  }
  if (skipped.length) {
    lines.push(`### ⚠️ Needs Manual Review`);
    skipped.forEach((s, i) => {
      lines.push(`${i + 1}. **${s.title}** — ${s.reason}`);
      if (s.rationale) lines.push(`   _Rationale: ${s.rationale}_`);
    });
    lines.push('');
  }
  return lines.join('\n');
}
