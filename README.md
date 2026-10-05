# QR Code Coaster

Design a multicolor, 3D-printable QR code coaster and download it as a `.3mf` file ready for Bambu Studio. It's free, and nothing you enter ever leaves your browser.

**Make one at [www.paraesthesia.com/qr-code-coaster](https://www.paraesthesia.com/qr-code-coaster/).**

## Your data stays on your device

The app is a static page with no server-side code, analytics, cookies, or saved state. Everything (encoding the QR code, building the 3D model, writing the file) runs in your browser. The page's Content Security Policy blocks it from contacting any other site, so a Wi-Fi password or contact card has nowhere to go but the file you download. Uploaded logos and fonts are read locally, and closing the tab discards everything.

## Making a coaster

1. Choose what the code holds: a link, text, email, phone call, SMS, WhatsApp message, Wi-Fi login, contact card, or calendar event.
2. Pick a round or square coaster and set its size and thickness.
3. Choose up to four filament colors, then assign each part of the design to one of them.
4. Style the pattern and the corner squares, and optionally add a built-in icon or your own SVG logo, plus text above or below the code.
5. Drag the 3D preview to inspect it, then download the `.3mf`.

Warnings under the preview flag anything likely to print or scan poorly, such as weak contrast or modules too small for your nozzle.

## Printing it

When you open the file, Bambu Studio offers to match its colors to your filaments. Accept or adjust the match and each color prints as its own filament. Other 3MF slicers import the same parts, and you assign their filaments yourself.

The colors are inlaid flush into the top few layers (the depth is adjustable), so the surface stays flat under a glass. Before printing, scan the top view of the preview with your phone to confirm the code works.

## Credits

Brand icons come from [Simple Icons](https://simpleicons.org/), and brand names and logos are trademarks of their owners. General icons are from [Material Design Icons](https://pictogrammers.com/library/mdi/). The bundled fonts are open-licensed and come via [Fontsource](https://fontsource.org/).

Want to help? See [CONTRIBUTING.md](CONTRIBUTING.md). Released under the [MIT License](LICENSE).
