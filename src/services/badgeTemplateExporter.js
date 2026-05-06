// Convert generated Trailhead badge markdown into the Badge Template structure
// (see trailhead_prompt_etc/Badge Template.pdf for the source-of-truth layout).
//
// The AI badge output uses a predictable shape:
//   # Badge Title
//   <description paragraph(s)>
//   # Unit 1 Title
//     ## Learning Objectives | Introduction | <topic H2s> | Summary | Quiz | Resources
//   # Unit 2 Title ...
//
// We parse that shape and re-emit it in the order the Badge Template expects.
// Anything we can't confidently classify is preserved verbatim under the unit
// it belongs to so nothing is silently dropped.

const PLACEHOLDER = '[Fill in manually]';

function splitOnH1(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+?)\s*$/);
    if (h1Match) {
      if (current) sections.push(current);
      current = { title: h1Match[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      // Pre-H1 preamble — attach to a synthetic header section
      current = { title: '', body: [line] };
    }
  }
  if (current) sections.push(current);
  return sections;
}

function joinBody(lines) {
  return lines.join('\n').replace(/^\s+|\s+$/g, '');
}

// Extract a labeled subsection by H2 title (case-insensitive substring match).
// Returns { content, startIdx, endIdx } or null.
function extractH2Section(bodyLines, ...titleSubstrings) {
  const h2Indexes = [];
  bodyLines.forEach((line, i) => {
    if (/^##\s+/.test(line)) h2Indexes.push(i);
  });

  for (let i = 0; i < h2Indexes.length; i++) {
    const idx = h2Indexes[i];
    const heading = bodyLines[idx].replace(/^##\s+/, '').toLowerCase();
    if (titleSubstrings.some(t => heading.includes(t.toLowerCase()))) {
      const end = h2Indexes[i + 1] ?? bodyLines.length;
      return {
        content: joinBody(bodyLines.slice(idx + 1, end)),
        startIdx: idx,
        endIdx: end,
      };
    }
  }
  return null;
}

function parseLearningObjectives(content) {
  if (!content) return [];
  return content
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*]\s+/.test(l) || /^\d+\.\s+/.test(l))
    .map(l => l.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean);
}

// Parse the Quiz section into [{ question, answers: [{letter, text, correct}], explanation }]
function parseQuiz(content) {
  if (!content) return [];
  const questions = [];
  const lines = content.split('\n');

  let current = null;
  const flush = () => { if (current && current.question) questions.push(current); };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Question marker — bolded "Question N:" or numbered "1." or "**1.**"
    const stripped = line.replace(/^\*+\s*/, '');
    const qMatch = stripped.match(/^(?:Question\s*\d+[:.]?|\d+\.)\s*\**\s*(.*)$/i);
    if (qMatch && (stripped.toLowerCase().startsWith('question') || /^\d+\.\s/.test(stripped))) {
      flush();
      current = { question: qMatch[1].replace(/\*+$/, '').trim(), answers: [], explanation: '' };
      continue;
    }

    // Answer marker — "A. ...", "- A) ...", "**A.** ..."
    const aMatch = line.match(/^[-*]?\s*\*{0,2}([A-D])[\.\)]\s*\*{0,2}\s*(.+?)\s*\*{0,2}\s*$/);
    if (aMatch && current) {
      const text = aMatch[2].replace(/\s*\(correct\)\s*$/i, '').trim();
      const correct = /\(correct\)/i.test(line) || /\*\*correct\*\*/i.test(line);
      current.answers.push({ letter: aMatch[1], text, correct });
      continue;
    }

    // Correct-answer callout
    const correctMatch = line.match(/correct\s+answer[:\s]*\*?\*?([A-D])/i);
    if (correctMatch && current) {
      const letter = correctMatch[1];
      const ans = current.answers.find(a => a.letter === letter);
      if (ans) ans.correct = true;
      continue;
    }

    if (current) {
      // Treat as explanation/extra context
      current.explanation = (current.explanation ? current.explanation + ' ' : '') + line;
    }
  }
  flush();
  return questions;
}

function extractWordCount(text) {
  if (!text) return '';
  // Rough estimate — strip headings/lists markers, count whitespace-separated tokens.
  const stripped = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_>`-]/g, ' ');
  const words = stripped.split(/\s+/).filter(Boolean);
  return words.length.toString();
}

function buildUnitTemplate(unit, unitNumber) {
  const lines = unit.body;
  const objectives = parseLearningObjectives(extractH2Section(lines, 'learning objective')?.content);
  const quizQuestions = parseQuiz(extractH2Section(lines, 'quiz', 'assessment')?.content);
  const resources = extractH2Section(lines, 'resource')?.content || '';

  // "Body" = everything that isn't objectives/quiz/resources, preserved verbatim.
  const skipHeadings = ['learning objective', 'quiz', 'assessment', 'resource'];
  const h2Indexes = [];
  lines.forEach((line, i) => { if (/^##\s+/.test(line)) h2Indexes.push(i); });

  const bodyParts = [];
  // Anything before the first H2 (introduction / hook)
  if (h2Indexes.length > 0 && h2Indexes[0] > 0) {
    bodyParts.push(joinBody(lines.slice(0, h2Indexes[0])));
  } else if (h2Indexes.length === 0) {
    bodyParts.push(joinBody(lines));
  }
  for (let i = 0; i < h2Indexes.length; i++) {
    const idx = h2Indexes[i];
    const heading = lines[idx].replace(/^##\s+/, '').toLowerCase();
    if (skipHeadings.some(s => heading.includes(s))) continue;
    const end = h2Indexes[i + 1] ?? lines.length;
    bodyParts.push(joinBody(lines.slice(idx, end)));
  }

  const body = bodyParts.filter(Boolean).join('\n\n');

  let out = '';
  out += `## Unit ${unitNumber}: ${unit.title}\n\n`;
  out += `### Learning Objectives\n\n`;
  out += `After completing this unit, you'll be able to:\n\n`;
  if (objectives.length) {
    objectives.forEach(o => { out += `- ${o}\n`; });
  } else {
    out += `- ${PLACEHOLDER}\n`;
  }
  out += `\n`;

  if (body) {
    out += `${body}\n\n`;
  }

  if (resources) {
    out += `### Resources\n\n${resources}\n\n`;
  } else {
    out += `### Resources\n\n- ${PLACEHOLDER}\n\n`;
  }

  out += `### Quiz\n\n`;
  out += `| Learning Objective | Question | Answers (correct answer underlined) |\n`;
  out += `|---|---|---|\n`;
  if (quizQuestions.length) {
    quizQuestions.forEach((q, i) => {
      const lo = objectives[i] || objectives[0] || PLACEHOLDER;
      const answers = q.answers
        .map(a => {
          const text = a.correct ? `<u>${a.text}</u>` : a.text;
          return `${a.letter}. ${text}`;
        })
        .join('<br>');
      out += `| ${lo.replace(/\|/g, '\\|')} | ${q.question.replace(/\|/g, '\\|')} | ${answers || PLACEHOLDER} |\n`;
    });
  } else {
    out += `| ${PLACEHOLDER} | ${PLACEHOLDER} | A. ${PLACEHOLDER}<br>B. ${PLACEHOLDER}<br>C. ${PLACEHOLDER}<br>D. ${PLACEHOLDER} |\n`;
  }
  out += `\n`;

  return out;
}

/**
 * Convert a generated Trailhead badge draft (markdown) into the Badge Template
 * structure as a single markdown string, ready for download/paste-into-Doc.
 *
 * @param {string} badgeMarkdown - The raw AI-generated badge draft.
 * @param {object} [opts]
 * @param {string} [opts.badgeType] - 'regular' or 'quickLook' (informational only).
 * @returns {string}
 */
export function buildBadgeTemplateMarkdown(badgeMarkdown, opts = {}) {
  const { badgeType = 'regular' } = opts;
  const sections = splitOnH1(badgeMarkdown).filter(s => s.title || s.body.some(l => l.trim()));

  // First H1 = badge; remaining H1s = units. If only one H1 exists and it
  // doesn't look like a unit title, treat it as the badge with no parsed units.
  const [badge, ...units] = sections;
  const badgeTitle = badge?.title || PLACEHOLDER;
  const badgeDescription = joinBody(badge?.body || [])
    .split('\n\n')[0] // first paragraph
    || PLACEHOLDER;

  const unitRows = units.map((u, i) => {
    const wordCount = extractWordCount(joinBody(u.body));
    return `| ${i + 1} | ${u.title} | (Select Type) | ${wordCount} |`;
  });

  let out = '';
  out += `# Badge Template\n\n`;
  out += `## Badge Name\n\n${badgeTitle}\n\n`;
  out += `## Badge Description\n\n${badgeDescription}\n\n`;
  out += `## Suggested Unit Titles\n\n`;
  out += `| # | Name | Type | Word Count |\n`;
  out += `|---|---|---|---|\n`;
  if (unitRows.length) {
    out += unitRows.join('\n') + '\n\n';
  } else {
    out += `| 1 | ${PLACEHOLDER} | (Select Type) | 0 |\n\n`;
  }

  out += `## AI Usage\n\nDid you use AI to help you write this badge content? **Yes**\n\nAI tool used: Claude (via CX AI Content Workbench)\n\n`;

  out += `## Suggested Category\n\n`;
  out += `- **Role:** ${PLACEHOLDER}\n`;
  out += `- **Level:** ${PLACEHOLDER}\n`;
  out += `- **Trailhead Products/Features:** ${PLACEHOLDER}\n`;
  out += `- **Industry:** ${PLACEHOLDER} (if applicable)\n`;
  out += `- **Primary Product/Feature:** ${PLACEHOLDER} (internal use only)\n`;
  out += `- **Skills (1–5):** ${PLACEHOLDER}\n\n`;

  out += `## Prerequisite Badges\n\n- ${PLACEHOLDER}\n\n`;

  out += `## Supporting Documents\n\n- Outline: ${PLACEHOLDER}\n- Quiz: ${PLACEHOLDER}\n- HOC: ${PLACEHOLDER}\n\n`;

  out += `---\n\n`;

  if (units.length) {
    units.forEach((u, i) => {
      out += buildUnitTemplate(u, i + 1);
      out += `---\n\n`;
    });
  } else {
    // Fall back: pass the raw content through inside a single Unit 1 block.
    out += `## Unit 1: ${PLACEHOLDER}\n\n`;
    out += joinBody(badge?.body || []) + '\n\n';
    out += `---\n\n`;
  }

  out += `_Generated from CX AI Content Workbench. Badge type: ${badgeType}. Fill in placeholders before submitting to editorial._\n`;

  return out;
}
