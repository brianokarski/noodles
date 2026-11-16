#!/usr/bin/env python3
"""
pinrip — rip a Pinterest board to a local folder.

Stdlib only. Pulls full-resolution originals, videos and gifs, writes a
board.json of metadata alongside, and skips anything already downloaded
so re-running a board just fetches what's new.

USAGE
  pinrip.py <board-url> [more urls...] [options]

  ./pinrip.py https://www.pinterest.com/someuser/some-board/
  ./pinrip.py https://pinterest.com/u/b/ --out ~/Desktop/refs --limit 50
  ./pinrip.py https://pinterest.com/u/secret-board/ --cookie-file ~/.pinterest_cookie

OPTIONS
  --out DIR         parent folder (default ~/Desktop/pinterest_downloads)
  --limit N         stop after N pins
  --cookie STR      raw Cookie header, for private/secret boards
  --cookie-file F   read the cookie from a file instead
  --no-video        skip mp4s
  --no-meta         don't write board.json
  --flat            everything into --out, no per-board subfolder
  --dry-run         list what would be fetched, download nothing

PRIVATE BOARDS
  Log into Pinterest in your browser, open DevTools → Network → click any
  request → copy the whole `Cookie:` request header, and pass it with
  --cookie / --cookie-file.
"""

import argparse
import http.cookiejar
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
RESOURCE = "https://www.pinterest.com/resource/BoardFeedResource/get/"


class Session:
    """Cookie-jar session. Pinterest's resource API 403s without one."""

    def __init__(self, cookie=None):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.extra_cookie = cookie

    def csrf(self):
        for c in self.jar:
            if c.name == "csrftoken":
                return c.value
        return ""

    def get(self, url, referer="https://www.pinterest.com/", binary=False, api=False):
        headers = {
            "User-Agent": UA,
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": referer,
            "Accept": "*/*" if binary else "application/json, text/javascript, */*, q=0.01",
        }
        if api:
            path = urllib.parse.urlparse(referer).path
            headers.update(
                {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRFToken": self.csrf(),
                    "X-APP-VERSION": "a94b8e5",
                    "X-Pinterest-AppState": "active",
                    "X-Pinterest-Source-Url": path,
                    "X-Pinterest-PWS-Handler": "www/[username]/[slug].js",
                }
            )
        if self.extra_cookie:
            headers["Cookie"] = self.extra_cookie
        req = urllib.request.Request(url, headers=headers)
        with self.op.open(req, timeout=45) as r:
            return r.read() if binary else r.read().decode("utf-8", "replace")


def slug_from_url(url):
    parts = [p for p in urllib.parse.urlparse(url).path.split("/") if p]
    return parts[-1] if parts else "board"


# ------------------------------------------------------- board discovery
def initial_props(html):
    """The page ships its whole redux state in a script tag."""
    m = re.search(
        r'<script id="__PWS_INITIAL_PROPS__"[^>]*>(.*?)</script>', html, re.S
    )
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return {}


def board_from_props(props):
    """-> (board_id, name, pin_count, first_page_pins, next_bookmark, feed_options)

    The page caches its feed under a key that *is* the option set the site
    itself uses. Reusing those options verbatim is what makes pagination
    return the whole board instead of stopping after a page.
    """
    ir = props.get("initialReduxState", {}) or {}
    board_id = name = None
    pin_count = 0
    boards = ir.get("boards") or {}
    for bid, b in boards.items():
        if isinstance(b, dict) and b.get("type") == "board":
            board_id = str(b.get("id") or bid)
            name = b.get("name")
            pin_count = b.get("pin_count") or 0
            break
    pins, bookmark, options = [], None, None
    bf = (ir.get("resources") or {}).get("BoardFeedResource") or {}
    for key, entry in bf.items():
        if not isinstance(entry, dict):
            continue
        try:
            options = dict(json.loads(key))
        except Exception:
            options = None
        if entry.get("data"):
            pins = [p for p in entry["data"] if isinstance(p, dict)]
            bookmark = entry.get("nextBookmark")
            break
    if not options and board_id:
        options = {
            "board_id": board_id,
            "field_set_key": "react_grid_pin",
            "page_size": 25,
            "add_vase": True,
            "is_react": True,
            "redux_normalize_feed": True,
        }
    return board_id, name, pin_count, pins, bookmark, options


def embedded_pins(html):
    """Last resort: image URLs baked into the HTML."""
    out = []
    for m in re.finditer(r'"(https://i\.pinimg\.com/[^"]+\.(?:jpg|jpeg|png|gif|webp))"', html):
        out.append(m.group(1).replace("\\u002F", "/"))
    return out


def board_feed(sess, base_options, referer, bookmark, limit=None, already=0):
    """Continue paginating BoardFeedResource from a bookmark."""
    seen = already
    while bookmark and bookmark != "-end-":
        options = dict(base_options or {})
        options["bookmarks"] = [bookmark]
        q = urllib.parse.urlencode(
            {
                "source_url": urllib.parse.urlparse(referer).path,
                "data": json.dumps({"options": options, "context": {}}),
            }
        )
        try:
            raw = sess.get(RESOURCE + "?" + q, referer=referer, api=True)
            data = json.loads(raw)
        except urllib.error.HTTPError as e:
            print(f"  ! feed HTTP {e.code} — stopping here", file=sys.stderr)
            return
        except Exception as e:
            print(f"  ! feed error {e} — stopping here", file=sys.stderr)
            return

        rr = data.get("resource_response", {})
        pins = rr.get("data") or []
        if isinstance(pins, dict):
            pins = pins.get("results") or []
        if not pins:
            return
        for p in pins:
            if not isinstance(p, dict):
                continue
            yield p
            seen += 1
            if limit and seen >= limit:
                return
        bookmark = rr.get("bookmark")
        time.sleep(0.35)


# ------------------------------------------------------------ pin assets
def to_original(url):
    """Rewrite a sized pinimg URL to the full-resolution original."""
    return re.sub(r"/\d+x\d*/", "/originals/", url)


def assets_from_pin(pin, want_video=True):
    """Return [(url, suffix)] — suffix distinguishes carousel slots."""
    out = []
    pid = str(pin.get("id") or "")

    # carousel: one image per slot
    carousel = (pin.get("carousel_data") or {}).get("carousel_slots") or []
    for slot in carousel:
        imgs = slot.get("images") or {}
        best = imgs.get("orig") or next(iter(imgs.values()), None)
        if best and best.get("url"):
            out.append((to_original(best["url"]), str(slot.get("id") or "")))
    if out:
        return out

    # video pin
    if want_video:
        vids = (pin.get("videos") or {}).get("video_list") or {}
        if vids:
            best = None
            for key in ("V_720P", "V_HLSV4", "V_HLSV3_MOBILE"):
                if key in vids:
                    best = vids[key]
                    break
            best = best or next(iter(vids.values()), None)
            if best and best.get("url", "").endswith(".mp4"):
                out.append((best["url"], ""))
                return out

    # still image
    imgs = pin.get("images") or {}
    best = imgs.get("orig") or imgs.get("736x")
    if not best:
        # pick the widest variant on offer
        cands = [v for v in imgs.values() if isinstance(v, dict) and v.get("url")]
        cands.sort(key=lambda v: v.get("width") or 0, reverse=True)
        best = cands[0] if cands else None
    if best and best.get("url"):
        out.append((to_original(best["url"]), ""))
        return out

    # story/idea pins keep their image elsewhere
    for path in (
        ("story_pin_data", "pages"),
        ("pin_join", "visual_objects"),
    ):
        node = pin
        for k in path:
            node = (node or {}).get(k) if isinstance(node, dict) else None
        if isinstance(node, list):
            for pg in node:
                blocks = (pg or {}).get("blocks") or []
                for blk in blocks:
                    im = (blk or {}).get("image") or {}
                    variants = im.get("images") or {}
                    cand = variants.get("originals") or variants.get("orig")
                    if cand and cand.get("url"):
                        out.append((cand["url"], str(blk.get("block_type") or "")))
    return out


def _s(v):
    """Pinterest returns strings, dicts or None for the same field. Coerce."""
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dict):
        for k in ("text", "value", "title", "en"):
            if isinstance(v.get(k), str):
                return v[k].strip()
    return ""


def meta_from_pin(pin):
    pid = pin.get("id")
    return {
        "id": pid,
        "title": _s(pin.get("title")) or _s(pin.get("grid_title")),
        "description": _s(pin.get("description")),
        "link": pin.get("link") if isinstance(pin.get("link"), str) else None,
        "pin_url": f"https://www.pinterest.com/pin/{pid}/" if pid else None,
        "dominant_color": pin.get("dominant_color"),
        "created_at": pin.get("created_at"),
    }


# ----------------------------------------------------------------- main
def rip(url, args):
    slug = slug_from_url(url)
    out_dir = args.out if args.flat else os.path.join(args.out, slug)
    os.makedirs(out_dir, exist_ok=True)
    print(f"\n\033[1m{slug}\033[0m → {out_dir}")

    cookie = args.cookie
    if args.cookie_file:
        cookie = open(os.path.expanduser(args.cookie_file)).read().strip()

    sess = Session(cookie)
    try:
        html = sess.get(url, referer=url)
    except Exception as e:
        print(f"  ! could not load board page: {e}", file=sys.stderr)
        return

    board_id, name, pin_count, pins, bookmark, options = board_from_props(initial_props(html))
    if board_id:
        print(f"  “{name}” · board {board_id} · {pin_count} pins on Pinterest")
        if args.limit:
            pins = pins[: args.limit]
        if bookmark and (not args.limit or len(pins) < args.limit):
            for p in board_feed(sess, options, url, bookmark, args.limit, len(pins)):
                pins.append(p)
        # de-dupe: the first page can overlap the first paginated page
        seen_ids, uniq = set(), []
        for p in pins:
            pid = str(p.get("id") or "")
            if pid and pid in seen_ids:
                continue
            seen_ids.add(pid)
            uniq.append(p)
        pins = uniq
    if not pins:
        print("  (no feed data — falling back to images embedded in the page)")
        urls = list(dict.fromkeys(embedded_pins(html)))
        if args.limit:
            urls = urls[: args.limit]
        pins = [
            {"id": re.sub(r"\W", "", u.split("/")[-1].split(".")[0]), "images": {"orig": {"url": u}}}
            for u in urls
        ]

    print(f"  {len(pins)} pins to process")
    got = skipped = failed = 0
    metas = []

    for pin in pins:
        pid = str(pin.get("id") or "")
        metas.append(meta_from_pin(pin))
        for asset_url, suffix in assets_from_pin(pin, want_video=not args.no_video):
            ext = os.path.splitext(urllib.parse.urlparse(asset_url).path)[1] or ".jpg"
            fname = f"pinterest_{pid}" + (f"_{suffix}" if suffix else "") + ext
            dest = os.path.join(out_dir, fname)
            if os.path.exists(dest) and os.path.getsize(dest) > 0:
                skipped += 1
                continue
            if args.dry_run:
                print(f"    would fetch {fname}")
                got += 1
                continue
            try:
                blob = sess.get(asset_url, referer=url, binary=True)
                with open(dest, "wb") as f:
                    f.write(blob)
                got += 1
                print(f"    ✓ {fname}  ({len(blob)//1024} KB)")
            except urllib.error.HTTPError as e:
                # originals/ sometimes 404s — fall back to the sized URL
                if "/originals/" in asset_url:
                    try:
                        blob = sess.get(
                            asset_url.replace("/originals/", "/736x/"),
                            referer=url, binary=True,
                        )
                        with open(dest, "wb") as f:
                            f.write(blob)
                        got += 1
                        print(f"    ✓ {fname}  (736x fallback)")
                        continue
                    except Exception:
                        pass
                failed += 1
                print(f"    ✗ {fname}  HTTP {e.code}", file=sys.stderr)
            except Exception as e:
                failed += 1
                print(f"    ✗ {fname}  {e}", file=sys.stderr)
            time.sleep(0.12)

    if not args.no_meta and not args.dry_run:
        with open(os.path.join(out_dir, "board.json"), "w") as f:
            json.dump(
                {
                    "board": slug,
                    "name": name,
                    "source": url,
                    "ripped": time.strftime("%Y-%m-%d %H:%M"),
                    "pins": metas,
                },
                f,
                indent=2,
            )
    print(f"  \033[1mdone\033[0m — {got} new, {skipped} already had, {failed} failed")


def main():
    ap = argparse.ArgumentParser(add_help=True, description="Rip a Pinterest board.")
    ap.add_argument("urls", nargs="+")
    ap.add_argument("--out", default=os.path.expanduser("~/Desktop/pinterest_downloads"))
    ap.add_argument("--limit", type=int)
    ap.add_argument("--cookie")
    ap.add_argument("--cookie-file")
    ap.add_argument("--no-video", action="store_true")
    ap.add_argument("--no-meta", action="store_true")
    ap.add_argument("--flat", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    args.out = os.path.expanduser(args.out)
    for u in args.urls:
        rip(u, args)


if __name__ == "__main__":
    main()
