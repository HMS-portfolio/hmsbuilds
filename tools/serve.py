"""Local preview server for the static site.

    (started by .claude/launch.json as the "portfolio" configuration)

Plain `python3 -m http.server` cannot preview this site correctly, for two
reasons that both produce convincing false results:

  1. vercel.json sets "cleanUrls": true, so production serves nama.html at
     /nama. http.server would 404 that path, and the router would fall back to
     Home, making a broken route look like a routing bug that is not there.

  2. http.server sends no cache headers at all, so an edited stylesheet can be
     served from the browser's memory cache and a real fix can look like it
     did nothing. Every response here is explicitly no-store.

Lives in tools/ rather than a scratch directory so the launch configuration
keeps working across sessions.
"""

import http.server
import os

PORT = int(os.environ.get("PORT", "4173"))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        """Resolve /nama to nama.html, the way cleanUrls does in production."""
        resolved = super().translate_path(path)
        if not os.path.exists(resolved) and not path.endswith("/"):
            candidate = resolved + ".html"
            if os.path.isfile(candidate):
                return candidate
        return resolved

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # the preview pane has its own request log

    def handle_one_request(self):
        """Swallow the disconnect a cancelled request produces.

        The home page pulls a long sequence of hero frames and abandons the
        ones it no longer needs, which is normal browser behaviour and not an
        error. The default handler prints a full traceback for each, burying
        anything that actually matters."""
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True


class Server(http.server.ThreadingHTTPServer):
    """Threaded on purpose. A single-threaded server serialises those same
    hero frames, and the page appears to hang rather than to load."""

    allow_reuse_address = True
    daemon_threads = True


with Server(("", PORT), Handler) as httpd:
    print("serving %s on http://localhost:%d" % (ROOT, PORT))
    httpd.serve_forever()
