---
name: harricat
description: >-
  Installs the HarriCat corner cat into a Next.js web app and switches its
  KuroCat skin. Use when the user says harricat-install, asks to install
  HarriCat, or names a coat such as black, siamese, Brown Tabby, or Palico.
---

# HarriCat

HarriCat is a Next.js corner cat derived from KuroCat by chanke17 (MIT). It is not the official KuroCat desktop app. Keep `LICENSE` and the chanke17 copyright on every copy. Credit https://github.com/chanke17/KuroCat.

## Command

Run from the Next.js app root. The skill directory is the folder that contains this file.

```bash
node <skill-dir>/scripts/harricat-install.mjs
node <skill-dir>/scripts/harricat-install.mjs <skin>
```

`harricat-install` with no skin installs **black**. `harricat-install siamese` installs or switches to that coat. Ids and English names are in [skins.md](skins.md).

## After the script

1. Confirm `app/layout.tsx` renders `<HarriCat />`.
2. If middleware redirects unknown paths to login, add `kurocat/` to the public matcher so `/kurocat/pet/*.js` is a static file. Do not change who can open app pages.
3. Do not delete `public/kurocat/LICENSE`.
4. Double-click hides the cat. **Come back, cat** shows it again.

## Do not

- Do not vendor the native Swift, Win32, or GTK KuroCat apps.
- Do not claim HarriCat is an official KuroCat release.
- Do not strip the MIT notice.
