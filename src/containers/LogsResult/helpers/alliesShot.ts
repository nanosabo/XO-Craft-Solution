import { TEAM_COLOR_PROPERTIES } from "@src/helpers/teamColors";

const collectDocumentCss = (): string => {
  const chunks: string[] = [];

  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) chunks.push(rule.cssText);
    } catch {
      // A cross-origin sheet cannot be read. The app styles are inline.
    }
  }

  return chunks.join("\n");
};

export const buildAlliesShot = (
  root: HTMLElement,
  allyTeam: string,
): { html: string; width: number; height: number } | null => {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:0;top:0;z-index:-1;pointer-events:none;width:${root.offsetWidth}px;`;

  const clone = root.cloneNode(true) as HTMLElement;
  const computed = getComputedStyle(root);

  // The shot is rendered without the log view, which defines the team colors.
  for (const name of TEAM_COLOR_PROPERTIES) {
    clone.style.setProperty(name, computed.getPropertyValue(name));
  }

  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    if (allyTeam) {
      clone.querySelectorAll("tr").forEach((row) => {
        const team = row.getAttribute("data-team") ?? "";

        if (team && team !== allyTeam) row.remove();
      });
    }

    const wrap = clone.querySelector("table")?.parentElement;

    if (wrap instanceof HTMLElement) {
      wrap.style.margin = "0";
      wrap.style.overflow = "visible";
    }

    const width = Math.ceil(clone.scrollWidth);
    const height = Math.ceil(clone.scrollHeight);

    if (width < 2 || height < 2) return null;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${document.baseURI}"><style>html,body{margin:0;background:#111316;color:#fff;} ${collectDocumentCss()}</style></head><body>${clone.outerHTML}</body></html>`;

    return { html, width, height };
  } finally {
    host.remove();
  }
};
