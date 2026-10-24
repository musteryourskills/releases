# Invitation emails

The email sent when someone is let in off the waitlist, in the same four directions as the muster.is page:
Note, Terminal, Steps, Manual. Each is a standalone, send-ready file:

- `<name>.html`: the HTML part. Subject in `<title>`, preheader in the hidden `[data-preheader]` element.
- `<name>.txt`: the plain-text part. Send both (multipart/alternative).

Images load from `https://muster.is/assets/email/`, so they show once this repository is deployed. Every email
reads fine with images off. Each links to its page on muster.is (`?variant=<name>`), where the copy button works.

There's no name or merge tag: the waitlist only collected an email address. The copy asks people to reply, so
send from an address someone reads, or set Reply-To to one.

## Preview

```bash
python3 -m http.server 8791   # from the repository root
open "http://localhost:8791/emails/"
```

The preview shows the inbox line (sender, subject, preheader), desktop and phone widths, dark mode as Apple Mail
draws it, and the text part. ← → switch emails, M phone width, D dark, T text. It maps the image URLs to this
checkout, so it works before a deploy. Real clients still need a real send: Gmail ignores web fonts and inverts
colours in its apps, and classic Outlook drops rounded corners and gradients.

Once one direction is picked, keep its two files and delete the rest, with `index.html` here.
