export const safeParseJson = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

export const indentString = (str: string) => {
  if (!str || !str.length) {
    return str || "";
  }

  return str
    .split("\n")
    .map((line) => "  " + line)
    .join("\n");
};

export const outdentString = (str: string) => {
  if (!str || !str.length) {
    return str || "";
  }

  return str
    .split("\n")
    .map((line) => line.replace(/^  /, ""))
    .join("\n");
};
