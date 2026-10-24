# Invitation emails

The email sent when someone is let in off the waitlist, in the same four directions as the muster.is page:
Note, Terminal, Steps, Manual. Each is a standalone, send-ready pair:

- `<name>.html`: the HTML part. The subject is its `<title>`, the preheader its hidden `[data-preheader]` element.
- `<name>.txt`: the plain-text part.

Images load from `https://muster.is/assets/email/`, so they show once this repository is deployed. Every email
reads fine with images off. Each links to its page on muster.is (`?variant=<name>`), where the copy button works.

There's no name or merge tag: the waitlist only collected an email address.

## Preview

```bash
python3 -m http.server 8791   # from the repository root
open "http://localhost:8791/emails/"
```

The preview shows the inbox line (sender, subject, the first ~90 characters of preheader a phone shows), desktop,
375 and 320 widths, light, dark as Apple Mail draws it, Outlook.com's dark, and the text part. It can strip the
styles (what the Gmail app shows for non-Google accounts, and forwards), the web fonts (Gmail, Outlook) or the
images. ← → switch emails, M width, D appearance, T text, S strip. It maps the image URLs to this checkout, so it
works before a deploy.

It can't show Gmail's forced dark inversion or classic Outlook's Word renderer. Before sending, send a test to:
Gmail web, Gmail on iOS in dark mode, Apple Mail on macOS and iOS (light and dark), classic Outlook on Windows,
and Outlook.com in dark mode.

## Sending

- **Check:** `python3 emails/check.py` must pass. It catches the rules that break a send: the command not
  copying exactly, versions or dates going stale, images without size or alt, preheader and subject lengths.
- **Subject:** copy it from `<title>`; the title doesn't set it.
- **Parts:** multipart/alternative, `text/plain` first, then `text/html`, both `charset=utf-8`.
- **Reply-To:** a mailbox someone reads. Every email asks people to reply.
- **Version (Terminal only):** its transcript shows the installer's output, version included. Stamp the latest
  version just before a send, in both parts:

  ```bash
  v=$(curl -fsSL https://github.com/musteryourskills/releases/releases/latest/download/version)
  sed -i '' -E "s/Muster [0-9]+\.[0-9]+\.[0-9]+/Muster $v/g" emails/terminal.html emails/terminal.txt
  ```

  The other emails carry no version or date, so they stay true for as long as they sit in an inbox.
- **Deliverability:** a send to the whole waitlist looks like bulk mail to Gmail and Yahoo. Align SPF, DKIM and
  DMARC for the sending domain, and add a `List-Unsubscribe: <mailto:…>` header (plus
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click` if there's an https endpoint). Neither needs a visible link.

Once one direction is picked, keep its two files and delete the rest, with `index.html` here.
