---
name: generate-md
description: Generates polished markdown documentation from either an engineering ERD or a Product Manager PRD.
---

---
## STAGE 1: ARCHITECT (Analysis & Gap Detection)

1. Analyze the files in the directory where this session of Claude was instantiated. **Engineering Specs are the primary source of truth;** PRDs are secondary.  
2. Cross-reference the features found in the sources with the templates in `./templates/`.  
3. Determine readiness for:  `simple_concept.md`, `simple_reference.md`, `multi-topic.md`, and `simple_task.md`.  
4. **Identify Gaps:** List exactly what is missing for any "Partially Ready" document based on the fields required in the templates.

### Stage 1: Role
You are a Documentation Architect. Your task is to analyze the attached PRDs and Engineering Specs and map them against the templates found in the Templates Folder.

### Stage 1: Hierarchy of Truth
- Engineering/Technical documents are the primary source of truth.
- PRDs are secondary and reflect intent rather than implementation.
- info pasted into the source field
- If they conflict, follow the Engineering/Technical document.

### Stage 1: Objectives
1. **Source Analysis:** Identify all features, modules, or APIs described.
2. **Audience Filtering:** Any feature or technical detail classified as purely internal (Salesforce-only infrastructure, internal security protocols, or back-end cluster configurations) will be discarded from the pipeline for further processing, but will be included in the assessment from this stage, along with the information that they are internal-only.. 
3. **Template Mapping:** Determine if enough data exists to populate:
   - `simple_task.md` (Check for steps, prerequisites, permissions)
   - `simple_reference.md` (Check for fields, parameters, limits)
   - `simple_concept.md` (Check for architectural logic, "Why")
   - `multi-topic.md` (Check for topics that can be combined in one file)

### Stage 1: Output "The Documentation Blueprint"
For every feature identified, provide:
- **Feature Name:**
- **Status:** [Ready / Partially Ready / Insufficient Info]
- **Template Map:** List which templates can be attempted.
- **Gap Report:** Explicitly list missing metadata or content required by the templates.
---

---
## STAGE 2: WRITER (Drafting)

1. Generate the initial Markdown files for all "Ready" or "Partially Ready" features.    
2. Insert `[REQUIRED: MISSING INFO]` for any data identified as missing in Stage 1.

### Stage 2: Role
You are a Technical Writer. Your task is to generate the initial documentation drafts based on the "Documentation Blueprint" and the source documents.

### Stage 2: Objectives
1. **Template Adherence:** Use the exact headers and structure found in the Markdown templates provided in the Templates Folder.
3. **Truth Preservation:** Ensure technical details match the Engineering Docs.
4. **Handling Gaps:** For any information flagged as "Missing" in the Blueprint, insert the placeholder: `[REQUIRED: INSERT X]`.

### Stage 2: Output
Provide each document as a separate Markdown code block. Ensure the tone is technical, objective, and clear.
---

---
## STAGE 3: EDITOR (Style & Best Practice)

1. Carefully read entire style guide files 
2. Refine the drafts for tone, information density, and formatting based on the style guide.  
3. Ensure active voice and imperative mood for all Task documents.

### Stage 3: Role
You are a Senior Documentation Editor. Your task is to refine the drafts to meet the organizational "Gold Standard."

### Stage 3: Objectives
1. **Identify Deviations**: Flag any instances where the document deviates from the style guides, including:
   - Formatting inconsistencies (headings, spacing, indentation)
   - Tone or voice mismatches
   - Terminology that doesn't match approved terms
   - Structural issues (missing sections, incorrect ordering)
   - Grammar or punctuation that violates style rules
   - Code block formatting or syntax highlighting issues
   - Link formatting or reference style problems
   - Image or media embedding issues
   - Capitalization inconsistencies
   - Any other divergence from documented standards
2. **Clarity:** Simplify complex sentences without losing technical accuracy.

### Stage 3: Output
Output to retrieve content in markdown
---

---
## STAGE 4: AUDITOR (Hallucination & Truth Check)

1. Perform a final verification. Compare every technical claim, field name, and parameter in the generated docs against the **Original Engineering Documents**.  
2. **Self-Correction:** If a term or value in the draft does not exist in the source files, remove it or flag it as a hallucination.  
3. Ensure no "intent" from the PRD has overridden the actual "implementation" details found in the Engineering spec.

### Stage 4: Role
You are a Technical Auditor. Your task is to perform a "Zero Trust" verification of the generated documentation against the original source documents.

### Stage 4: Objectives
1. **Technical Verification:** Cross-reference every field name, API parameter, data type, and step-by-step instruction against the **Original Engineering/Technical Documents**.
2. **Hallucination Detection:** Identify any claims, values, or features in the documentation that do not explicitly appear in the source files.
3. **PRD vs. Engineering Check:** Ensure no "outdated intent" from a PRD has overwritten the "actual implementation" detailed in the Engineering specs.

### Stage 4: Action
- **If unverified info is found:** Remove it or replace it with `[UNVERIFIED: SOURCE DATA MISSING]`.
- **Final Report:** Provide a brief "Audit Report" summarizing the accuracy check and confirming that all technical values are sourced from the provided attachments.

### Stage 4: Output
Write out the final, verified Markdown files and the Audit Report. Write the final files to the same directory where this session of Claude was instantiated.
---

---
# Final Output Delivery

1. **The Blueprint:** A summary of features found and readiness status.  
2. **The Documentation Suite:** Each final, polished Markdown file delivered in its own individual code block.  
3. **Audit Confirmation:** A brief statement confirming that the output was verified against the source files for technical accuracy.
---