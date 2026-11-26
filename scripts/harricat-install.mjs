#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.cwd();
const requested = process.argv.slice(2).find((arg) => !arg.startsWith("-")) || "black";

const skins = JSON.parse(
  fs.readFileSync(path.join(skillRoot, "assets", "pet", "skins.json"), "utf8"),
);

function resolveSkin(name) {
  const query = name.trim().toLowerCase();
  const hit = skins.find(
    (skin) =>
      skin.id.toLowerCase() === query ||
      String(skin.labelEn || "").toLowerCase() === query,
  );
  if (!hit) {
    const list = skins.map((skin) => `${skin.id} (${skin.labelEn})`).join("\n  ");
    console.error(`Unknown skin "${name}".\nSkins:\n  ${list}`);
    process.exit(1);
  }
  return hit.id;
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function writeSkinScript(skinId) {
  const source = fs.readFileSync(path.join(skillRoot, "assets", "pet", "web-pet.js"), "utf8");
  const next = source.replace(
    /var HARRICAT_SKIN = "[^"]*";/,
    `var HARRICAT_SKIN = "${skinId}";`,
  );
  if (!next.includes(`var HARRICAT_SKIN = "${skinId}";`)) {
    console.error("Could not set HARRICAT_SKIN in web-pet.js.");
    process.exit(1);
  }
  const dest = path.join(target, "public", "kurocat", "pet", "web-pet.js");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, next);
}

function findLayout() {
  for (const rel of ["app/layout.tsx", "src/app/layout.tsx"]) {
    const file = path.join(target, rel);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function mountLayout(file) {
  const original = fs.readFileSync(file, "utf8");
  if (original.includes("HarriCat")) return "already mounted";
  const lines = original.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith("import ")) lastImport = i;
  }
  if (lastImport === -1 || !original.includes("</body>")) {
    return "mount <HarriCat /> in the root layout yourself";
  }
  lines.splice(lastImport + 1, 0, 'import { HarriCat } from "@/components/harricat";');
  const next = lines.join("\n").replace("</body>", "<HarriCat />\n      </body>");
  fs.writeFileSync(file, next);
  return "mounted in " + path.relative(target, file);
}

if (!fs.existsSync(path.join(target, "package.json"))) {
  console.error("Run harricat-install from the Next.js app root (package.json was not found).");
  process.exit(1);
}

const skinId = resolveSkin(requested);
const petDir = path.join(skillRoot, "assets", "pet");

copyFile(path.join(skillRoot, "LICENSE"), path.join(target, "public", "kurocat", "LICENSE"));
for (const name of ["spec.js", "renderer.js", "skins.json"]) {
  copyFile(path.join(petDir, name), path.join(target, "public", "kurocat", "pet", name));
}
writeSkinScript(skinId);

const componentDir = path.join(target, "components");
fs.mkdirSync(componentDir, { recursive: true });
for (const name of ["harricat.tsx", "harricat.module.css"]) {
  const dest = path.join(componentDir, name);
  if (!fs.existsSync(dest)) {
    copyFile(path.join(skillRoot, "templates", name), dest);
  }
}

const layout = findLayout();
const layoutResult = layout ? mountLayout(layout) : "no app/layout.tsx found; mount <HarriCat /> yourself";
const middleware = ["middleware.ts", "src/middleware.ts"].find((rel) =>
  fs.existsSync(path.join(target, rel)),
);

console.log(`HarriCat skin: ${skinId}`);
console.log("Copied public/kurocat (MIT, Copyright (c) 2026 chanke17).");
console.log(layoutResult);
if (middleware) {
  const text = fs.readFileSync(path.join(target, middleware), "utf8");
  if (!text.includes("kurocat/")) {
    console.log(
      `If ${middleware} redirects unknown paths to login, add kurocat/ to the public matcher so /kurocat/pet/*.js is served. Do not change who can open app pages.`,
    );
  }
}
console.log("Double-click the cat to hide it. Come back, cat shows it again.");
