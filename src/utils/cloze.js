const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const uniqueTextOptions = (values = []) => {
  const used = new Set();
  const result = [];
  values.forEach((value) => {
    const normalized = normalizeText(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (used.has(key)) return;
    used.add(key);
    result.push(normalized);
  });
  return result;
};

const parseRawBlankOptions = (blankOptions) => {
  if (Array.isArray(blankOptions)) {
    return uniqueTextOptions(blankOptions);
  }
  if (!blankOptions || typeof blankOptions !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(blankOptions);
    return Array.isArray(parsed) ? uniqueTextOptions(parsed) : [];
  } catch {
    return [];
  }
};

export const parseBlankOptions = (blankOptions, acceptedAnswers = []) => {
  const parsedOptions = parseRawBlankOptions(blankOptions);
  const normalizedAnswers = Array.isArray(acceptedAnswers)
    ? uniqueTextOptions(acceptedAnswers)
    : [];

  // Keep the accepted answer visible in dropdown options for CLOZE select blanks.
  return uniqueTextOptions([...normalizedAnswers, ...parsedOptions]);
};

export const parseClozeToItems = (syntax = "") => {
  const items = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  let blankIndex = 1;

  while ((match = regex.exec(syntax)) !== null) {
    const parts = match[1].split("|").map((part) => part.trim());
    const correct = parts[0] || "";
    const hasSelectSyntax = parts.length > 1;
    const optionCandidates = hasSelectSyntax ? [correct, ...parts.slice(1)] : [];
    const options = uniqueTextOptions(optionCandidates);

    items.push({
      content: correct,
      itemKey: `blank-${blankIndex}`,
      role: "BLANK",
      blankIndex,
      acceptedAnswers: correct ? [correct] : [],
      blankType: hasSelectSyntax ? "SELECT" : "TEXT_INPUT",
      blankOptions: hasSelectSyntax ? JSON.stringify(options) : null,
      orderIndex: blankIndex,
    });

    blankIndex += 1;
  }

  return items;
};

export const parseClozeTokenOptions = (token = "") => {
  if (typeof token !== "string") {
    return [];
  }
  const match = token.match(/^\[\[([^\]]+)\]\]$/);
  if (!match) {
    return [];
  }
  const parts = match[1].split("|");
  if (parts.length <= 1) {
    return [];
  }
  return uniqueTextOptions(parts);
};

export const splitClozeContent = (content = "") => {
  const segments = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let blankIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: "blank",
      blankIndex,
      token: match[0],
    });
    blankIndex += 1;
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      value: content.slice(lastIndex),
    });
  }

  if (segments.length === 0) {
    segments.push({
      type: "text",
      value: content,
    });
  }

  return {
    segments,
    blankCount: blankIndex,
  };
};
