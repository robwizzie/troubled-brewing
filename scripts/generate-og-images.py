#!/usr/bin/env python3
"""Generate the branded 1200x630 Open Graph cards in public/og/.

One card per key page, built from the shop's REAL photos in public/images
(no stock, no AI art): cream panel with the fox logo, the page title in
Fraunces, a brass rule and the address; the photo framed on the right.

The page -> card mapping must match `og:` keys in src/lib/seo.js
(test/seo.test.js checks every key has a file).

Usage (from the repo root):
    python3 scripts/generate-og-images.py [--fonts-dir DIR] [--out public/og]

Fonts: the brand faces are Fraunces + Work Sans (Google Fonts, OFL). Pass
directories (':'-separated) holding fraunces-latin-600-normal.woff and
work-sans-latin-500-normal.woff / -600- (e.g. from `npm pack @fontsource/fraunces
@fontsource/work-sans` and extracting package/files/), or install them as
@fontsource packages in node_modules. Falls back to Lora / DejaVu if missing.
Requires Pillow.
"""
import argparse
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630

CREAM = (247, 241, 228)
PAPER = (255, 253, 247)
INK = (34, 31, 26)
INK_SOFT = (93, 86, 75)
BRASS = (227, 181, 63)
BRASS_DEEP = (168, 124, 28)
OLIVE = (84, 95, 51)

# key -> (photo, (focus_x, focus_y) as fractions, title, kicker)
CARDS = {
    "home": ("images/wall/our-story-so-far.jpg", (0.55, 0.5), "Haddon Heights’ neighborhood coffee house", "La Colombe coffee · Breakfast all day"),
    "menu": ("images/wall/order-menu.jpg", (0.5, 0.45), "The Menu", "La Colombe coffee · Metolius teas · Breakfast all day"),
    "about": ("images/wall/our-story.jpg", (0.5, 0.55), "Our Story", "Brewing Trouble on Station Ave since 2017"),
    "events": ("images/wall/whats-on.jpg", (0.5, 0.5), "Events", "What’s on at the coffee house"),
    "location": ("images/wall/flank-coffee.jpg", (0.42, 0.45), "Hours & Directions", "514 Station Ave · Open 7 days"),
    "contact": ("images/wall/flank-food.jpg", (0.5, 0.55), "Contact & Catering", "Call (856) 617-6638"),
    "timeline": ("images/wall/our-story-so-far.jpg", (0.3, 0.5), "Our Story So Far", "Since Friday the 13th, October 2017"),
    "reviews": ("images/wall/reviews.jpg", (0.5, 0.5), "Reviews", "What the neighborhood says"),
    "gallery-wall": ("images/wall/gallery-wall-2000.webp", (0.5, 0.33), "The Gallery Wall", "Framed art, a gold fox & curiosities"),
    "troublemakers": ("images/wall/troublemakers.jpg", (0.5, 0.5), "The Troublemakers", "The crew behind your coffee"),
    "neighborhood": ("images/wall/local-love.jpg", (0.5, 0.5), "Local Love", "Our Station Ave neighbors"),
    "gift-cards": ("images/pages/iced-coffee-tb-glass.jpg", (0.5, 0.5), "Gift Cards", "Give someone Trouble"),
}

PANEL = 520  # width of the cream text panel
PAD = 56


def find_font(fonts_dir, names, fallbacks, size):
    dirs = [d for d in (fonts_dir or "").split(os.pathsep) if d] + [
        os.path.join(ROOT, "node_modules/@fontsource/fraunces/files"),
        os.path.join(ROOT, "node_modules/@fontsource/work-sans/files"),
    ]
    for d in dirs:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    for p in fallbacks:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    print("warning: brand font not found, using Pillow default", file=sys.stderr)
    return ImageFont.load_default(size)


def cover(img, w, h, focus):
    """Scale + crop to fill w x h, keeping the focus point in frame."""
    s = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    fx, fy = focus
    x = min(max(round(img.width * fx - w / 2), 0), img.width - w)
    y = min(max(round(img.height * fy - h / 2), 0), img.height - h)
    return img.crop((x, y, x + w, y + h))


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def wrap_phrases(draw, text, font, max_w):
    """Like wrap(), but breaks between ' \u00b7 '-separated phrases first, so a
    phrase ("Breakfast all day") never splits across lines."""
    parts, lines, cur = text.split(" \u00b7 "), [], ""
    for part in parts:
        trial = f"{cur} \u00b7 {part}" if cur else part
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = part
    if cur:
        lines.append(cur)
    out = []
    for line in lines:
        out.extend(wrap(draw, line, font, max_w) if draw.textlength(line, font=font) > max_w else [line])
    return out


def make_card(key, spec, fonts, out_dir):
    photo_rel, focus, title, kicker = spec
    card = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(card)

    # photo, framed: brass edge on the panel side + a thin paper keyline inset
    photo = Image.open(os.path.join(ROOT, "public", photo_rel)).convert("RGB")
    card.paste(cover(photo, W - PANEL, H, focus), (PANEL, 0))
    d.rectangle([PANEL - 6, 0, PANEL, H], fill=BRASS)
    inset = 22
    d.rectangle([PANEL + inset, inset, W - inset, H - inset], outline=(*PAPER,), width=2)

    # logo — its artwork sits on opaque white, so multiply it onto the cream
    # (white drops out, the ink line-work stays crisp)
    logo = Image.open(os.path.join(ROOT, "public/images/brand/logo-fox.png")).convert("RGBA")
    lh = 196
    logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
    flat = Image.new("RGB", logo.size, (255, 255, 255))
    flat.paste(logo, (0, 0), logo)
    lx, ly = PAD - 14, 30
    region = card.crop((lx, ly, lx + logo.width, ly + lh))
    card.paste(ImageChops.multiply(region, flat), (lx, ly))

    # title — biggest size (64 → 40) that fits in 3 lines
    max_w = PANEL - PAD * 2 - 6
    for size in range(64, 38, -2):
        f = fonts["title"](size)
        lines = wrap(d, title, f, max_w)
        if len(lines) <= 3 and all(d.textlength(line, font=f) <= max_w for line in lines):
            break
    lead = round(size * 1.12)
    kf = fonts["kicker"](22)
    klines = wrap_phrases(d, kicker, kf, max_w)

    # centre the title block between the logo and the footer
    block = lead * len(lines) + 14 + 4 + 20 + 30 * len(klines)
    top, bottom = ly + lh + 18, H - PAD - 30
    y = top + max(0, (bottom - top - block) // 2)
    for line in lines:
        d.text((PAD, y), line, font=f, fill=INK)
        y += lead

    # brass rule + kicker
    y += 14
    d.rectangle([PAD, y, PAD + 72, y + 4], fill=BRASS_DEEP)
    y += 20
    for line in klines:
        d.text((PAD, y), line, font=kf, fill=INK_SOFT)
        y += 30

    # address footer
    af = fonts["small"](19)
    d.text((PAD, H - PAD - 6), "514 STATION AVE · HADDON HEIGHTS, NJ", font=af, fill=OLIVE)

    out = os.path.join(out_dir, f"{key}.jpg")
    card.save(out, "JPEG", quality=84, optimize=True, progressive=True, subsampling="4:2:0")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonts-dir", default=os.environ.get("OG_FONTS_DIR"))
    ap.add_argument("--out", default=os.path.join(ROOT, "public/og"))
    ap.add_argument("--only", nargs="*")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    serif_fb = ["/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"]
    sans_fb = ["/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    fonts = {
        "title": lambda s: find_font(args.fonts_dir, ["fraunces-latin-600-normal.woff", "Fraunces-SemiBold.ttf"], serif_fb, s),
        "kicker": lambda s: find_font(args.fonts_dir, ["work-sans-latin-500-normal.woff", "WorkSans-Medium.ttf"], sans_fb, s),
        "small": lambda s: find_font(args.fonts_dir, ["work-sans-latin-600-normal.woff", "WorkSans-SemiBold.ttf"], sans_fb, s),
    }
    for key, spec in CARDS.items():
        if args.only and key not in args.only:
            continue
        out = make_card(key, spec, fonts, args.out)
        print(f"{out}  {os.path.getsize(out) // 1024} KB")


if __name__ == "__main__":
    main()
