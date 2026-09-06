# Wordeer web preview

Independent browser preview of Wordeer. TANGO source is not modified or connected.

The browser preview uses a lightweight JavaScript UI with the shared dictionary
and native feature model. The Flutter sources are retained for the native app.

Build the browser preview:

```sh
python3 build-browser.py
```

Includes local English lookup, inflection lookup, categorized collection, favorites,
review and Wordeer JSON backup/restore. Browser-local persistence is for this
personal functionality preview; clearing browser storage deletes it. Use backup
before clearing data. Compatible browsers support click-to-start and click-to-stop
English speech recognition; the result opens the same word-card flow as typed
input. HTTPS and browser microphone permission are required. No account, cloud
sync, live DeepSeek, Action Button, or native recording integration is enabled.

Dictionary attribution: ECDICT MIT license in assets/ECDICT-LICENSE.txt.
Font: subset of Noto Sans SC, SIL OFL in assets/NotoSansSC-OFL.txt.

Optional WebMCP read_wordeer_library tool reads the same browser-local library.
No supported WebMCP validation context was available during packaging; its browser
contract is not claimed verified.
