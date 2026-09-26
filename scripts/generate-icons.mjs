/**
 * Gera os PNGs da PWA a partir dos SVGs em public/icons usando o Chromium
 * do Playwright (ou qualquer Chrome/Chromium instalado).
 *
 * Uso: CHROME_PATH=/caminho/do/chrome-headless-shell (ou chrome) node scripts/generate-icons.mjs
 * Alternativa sem script: exporte os PNGs em um editor/gerador de ícones
 * (ex.: realfavicongenerator.net) com os mesmos nomes de arquivo.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const chrome = process.env.CHROME_PATH ?? "chromium";
const iconsDir = resolve("public/icons");
const work = mkdtempSync(join(tmpdir(), "icons-"));

const targets = [
  { svg: "icon.svg", out: "icon-192.png", size: 192 },
  { svg: "icon.svg", out: "icon-512.png", size: 512 },
  { svg: "icon-maskable.svg", out: "icon-maskable-512.png", size: 512 },
  { svg: "icon-maskable.svg", out: "apple-icon.png", size: 180, dest: resolve("app") },
];

for (const target of targets) {
  const svg = readFileSync(join(iconsDir, target.svg), "utf8");
  const html = join(work, `${target.out}.html`);
  writeFileSync(
    html,
    `<html><body style="margin:0;background:transparent">${svg.replace(
      "<svg ",
      `<svg width="${target.size}" height="${target.size}" `,
    )}</body></html>`,
  );
  const png = join(work, target.out);
  execFileSync(chrome, [
    ...(chrome.includes("headless_shell") ? [] : ["--headless=new"]),
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--default-background-color=00000000",
    `--window-size=${target.size},${target.size}`,
    `--screenshot=${png}`,
    `file://${html}`,
  ], { stdio: "ignore" });
  copyFileSync(png, join(target.dest ?? iconsDir, target.out));
  console.log("ok", target.out);
}
