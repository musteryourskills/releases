#!/usr/bin/env python3
"""Lints the invitation emails against the rules that break a send. Run it before a send: python3 emails/check.py [name ...]"""
import re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
CMD = "curl -fsSL https://muster.is/install.sh | bash"


class Lint(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack, self.problems, self.imgs, self.links, self.text = [], [], [], [], []
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "svg", "form", "input", "iframe", "video"):
            self.problems.append(f"<{tag}> isn't allowed in email")
        if tag == "img":
            self.imgs.append(a)
        if tag == "a" and "href" in a:  # an <a> without href only stops autolinking
            self.links.append(a["href"])
        if tag == "style":
            self.in_style = True
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1][0] == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for t, line in self.stack[i + 1:]:
                    self.problems.append(f"<{t}> opened on line {line} isn't closed before </{tag}>")
                del self.stack[i:]
                return
        self.problems.append(f"stray </{tag}> on line {self.getpos()[0]}")

    def handle_data(self, data):
        if not self.in_style:
            self.text.append(data)


def visible_text(html):
    """The body's text roughly as a reader selects it: tags out, entities decoded."""
    import html as h
    body = re.sub(r"(?is)<(style|head)\b.*?</\1>", "", html)
    body = re.sub(r"(?s)<!--.*?-->", "", body)
    return h.unescape(re.sub(r"<[^>]+>", "", body))


def check(name):
    out = []
    html_path, txt_path = ROOT / f"{name}.html", ROOT / f"{name}.txt"
    if not html_path.exists():
        return [f"{name}.html is missing"]
    html = html_path.read_text()
    size = len(html.encode()) / 1024
    if size > 102:
        out.append(f"{size:.1f} KB: over Gmail's 102 KB clip")
    p = Lint()
    p.feed(html)
    out += p.problems
    out += [f"<{t}> opened on line {l} is never closed" for t, l in p.stack if t not in ("html", "body", "head")]
    if not re.search(r"<title>[^<]+</title>", html):
        out.append("no <title> (the subject)")
    if "data-preheader" not in html:
        out.append("no data-preheader element")
    if 'name="color-scheme"' not in html:
        out.append("no color-scheme meta")
    if 'lang="en"' not in html:
        out.append('no lang="en"')
    for img in p.imgs:
        for attr in ("width", "height", "alt"):
            if attr not in img:
                out.append(f"<img src={img.get('src')}> has no {attr}")
        if not img.get("src", "").startswith("https://muster.is/assets/email/"):
            out.append(f"<img src={img.get('src')}> isn't on https://muster.is/assets/email/")
        elif not (ROOT.parent / img["src"].removeprefix("https://muster.is/")).exists():
            out.append(f"{img['src']} doesn't exist in the checkout")
    for href in p.links:
        if not href.startswith(("https://", "mailto:")):
            out.append(f"link isn't absolute: {href!r}")
        if re.search(r"[?&]utm_", href):
            out.append(f"tracking parameter in {href}")
    # the command must survive select-and-copy: every visible occurrence, as text, must be exact
    text = visible_text(html)
    flat = re.sub(r"[ \t\r\n]+", " ", text)
    if CMD not in flat:
        out.append("the install command never appears as exact text")
    for m in re.finditer(r"curl[^\n]{0,80}?bash", text, re.S):
        seg = m.group(0)
        if " " in seg or re.search(r"[​-‍⁠﻿]", seg):
            out.append(f"invisible or non-breaking character inside the command: {seg!r}")
    for m in re.finditer(r"(?is)curl.{0,400}?bash", html):
        if re.search(r"(?i)<br|&nbsp;|&#160;|&#xa0;|&#8203;|&zwj;|&zwnj;", m.group(0)):
            out.append("a <br>, &nbsp; or zero-width entity sits inside the install command's markup")
    for word in ("!", "supercharge", "seamless", "unlock", "Hi there", "{{"):
        if word in text:
            out.append(f"house style: {word!r} in the body text")
    if re.search(r"(?<![a-z])organize", text, re.I):
        out.append("house style: American spelling (organize)")
    if re.search(r"\w'\w", text):
        out.append("house style: a straight apostrophe in body text")
    # policy: no versions or dates (they go stale in an inbox), except the Terminal transcript
    if name != "terminal":
        for src, label in ((text, "HTML"), (txt_path.read_text() if txt_path.exists() else "", "text")):
            if re.search(r"\b\d+\.\d+\.\d+\b", src.replace("127.0.0.1", "")):
                out.append(f"a version number in the {label} part")
            if re.search(r"\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)\b", src):
                out.append(f"a date in the {label} part")
    if re.search(r"#fff(fff)?\b", html, re.I):
        out.append("pure #fff/#ffffff (forced inversion): use #fefefe")
    title = re.search(r"<title>([^<]+)</title>", html)
    if title and len(title.group(1)) > 40:
        out.append(f"subject is {len(title.group(1))} characters (≤ 40)")
    pre = re.search(r"(?s)<div[^>]*data-preheader[^>]*>(.*?)</div>", html)
    if pre:
        import html as h
        pre_text = re.sub(r"[͏‌ ­﻿\s]+", " ", h.unescape(re.sub(r"<[^>]+>", "", pre.group(1)))).strip()
        if len(pre_text) > 90:
            out.append(f"preheader is {len(pre_text)} characters (≤ 90)")
    if not txt_path.exists():
        out.append(f"{name}.txt is missing")
    else:
        txt = txt_path.read_text()
        if CMD not in txt:
            out.append(f"{name}.txt: the install command isn't there exactly")
        if re.search(r"</?(a|p|div|span|table|td|tr|br|img|b|strong|em|code)\b[^>]*>", txt):
            out.append(f"{name}.txt: has HTML tags")
    return out, size


if __name__ == "__main__":
    names = sys.argv[1:] or [p.stem for p in sorted(ROOT.glob("*.html")) if p.stem != "index"]
    for n in names:
        result = check(n)
        if isinstance(result, list):
            print(f"✗ {n}: {result[0]}")
            continue
        problems, size = result
        print(f"{'✓' if not problems else '✗'} {n}.html ({size:.1f} KB)")
        for pr in problems:
            print(f"    - {pr}")
