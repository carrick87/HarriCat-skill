# HarriCat

A small corner cat for a Next.js app. Double-click the cat to send it away. **Come back, cat** brings it back.

The near paw holds the desk mouse and follows the pointer. A left click shows **LMB** and a right click shows **RMB** above that mouse. Moving the pointer wakes a sleeping cat.

HarriCat is a web overlay derived from [KuroCat](https://github.com/chanke17/KuroCat) by **chanke17**. It is not the official desktop app. The native macOS, Windows, and Linux pets stay in that repository.

## License

KuroCat is MIT, Copyright (c) 2026 chanke17. The MIT license allows you to use, copy, modify, and publish a derivative, including a clone repository, if you keep the copyright notice and the permission notice with the copy. This repo does that in `LICENSE` and `NOTICE.md`.

Do not remove `LICENSE`. Do not describe HarriCat as an official KuroCat release.

## Install into a web app

From the Next.js app root:

```bash
node path/to/HarriCat-skill/scripts/harricat-install.mjs
```

That installs the black cat. To pick a coat, pass the skin id or its English name:

```bash
harricat-install black
harricat-install siamese
harricat-install "Brown Tabby"
```

`harricat-install` is the npm bin name. From a clone, the same command is:

```bash
node path/to/HarriCat-skill/scripts/harricat-install.mjs siamese
```

Run it again with another skin to change the coat. It rewrites `public/kurocat/pet/web-pet.js` and leaves an existing `components/harricat.tsx` in place.

The script copies:

- `public/kurocat/` including the MIT `LICENSE`
- `components/harricat.tsx` and `components/harricat.module.css` when they are missing
- a `<HarriCat />` mount in `app/layout.tsx` when that file does not already include it

The canvas id stays `livePetCanvas`, and the public folder stays `kurocat/`, because those names belong to the upstream pet script.

If the app's middleware sends unknown paths to the login page, add `kurocat/` to the public matcher so `/kurocat/pet/*.js` is served as a file. Do not change who can open the app's pages.

## Change the skin

Skins are listed in [skins.md](skins.md).

```bash
harricat-install black
harricat-install siamese
harricat-install mackerel-tabby
harricat-install orangeWhite
harricat-install dazed-cat
harricat-install xiao-douni
```

English names work too: `harricat-install "Black Cat"`.

## Recent updates

### 1.0.1 (26 Nov 2026)
- The near paw holds the desk mouse and follows the pointer
- Moving the pointer wakes a sleeping cat
- A click shows LMB or RMB above that mouse

## Credits

- Original cat, renderer, and skins: **chanke17**, [chanke17/KuroCat](https://github.com/chanke17/KuroCat), MIT
- HarriCat installer and page overlay: carrick87, also MIT
