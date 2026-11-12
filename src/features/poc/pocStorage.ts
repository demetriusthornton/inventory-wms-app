import type { PocDocument } from "../../types";

/** True when the string is an absolute http(s) URL. */
export function isValidLink(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function makeLinkDocument(
  name: string,
  url: string,
  userName: string,
): PocDocument {
  return {
    id: crypto.randomUUID(),
    kind: "link",
    name: name.trim() || url.trim(),
    url: url.trim(),
    addedAt: new Date().toISOString(),
    addedBy: userName,
  };
}
