#!/usr/bin/env python3
"""دانلودر و آرشیوکننده عکس کاتالوگی خودرو — طبق sources.md

data/<brand>/<model>/<sha1>.<ext> — نام‌گذاری با SHA1 محتوا (تکراری خودکار رد می‌شود)
لاگ CSV: url, source, path, status, resolution
سیاست نرخ: ۱ درخواست/۲s هر دامنه، UA واقعی، ۳ تلاش با backoff 2/4/8s، توقف دامنه روی 403/429، سقف ۵۰۰/منبع/روز.

اجرا:
  python3 scripts/catalog-image-downloader.py --seeds scripts/catalog-seeds.json
  python3 scripts/catalog-image-downloader.py --self-test   # بدون شبکه
"""
import argparse, csv, hashlib, io, json, os, re, sys, time, urllib.parse
from collections import defaultdict

import requests
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

# الگوهای عکس تأییدشده در sources.md — برای mode=page
PATTERNS = [
    r'https://cdn-sth1\.bama\.ir/uploads/BamaImages/VehicleCarImages/[0-9a-f\-]+/CarImage_[0-9a-f]+(?:_thumb_\d+_\d+)?\.jpg(?:\?x-img=[^"\s\\]+)?',
    r'https://media\.khodro45\.com/public/image/[0-9a-f]+_plate_allure',
    r'https://cdn\.motor1\.com/images/mgl/[^/"\s]+/s1/[^"\s]+\.webp',
    r'https://asrekhodro\.com/wp-content/uploads/\d{4}/\d{2}/[^"\s]+?\.jpg',
]
UA_HEADERS = {"User-Agent": UA, "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8"}


def slug(s):
    s = re.sub(r'[^\w\-]+', '-', (s or '').strip(), flags=re.U).strip('-').lower()
    return s or 'unknown'


def clean(url):
    """حذف پارامترهای رهگیری API (utm_*) — همان فایل، URL تمیز در لاگ."""
    p = urllib.parse.urlsplit(url)
    if 'utm_' in p.query:
        keep = [kv for kv in p.query.split('&') if not kv.startswith('utm_')]
        url = urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, '&'.join(keep), p.fragment))
    return url


def save_bytes(raw, brand, model, out_root, min_width, seen):
    """اعتبارسنجی + ذخیره اتمیک. برمی‌گرداند (path|None, status, 'WxH'|'')."""
    try:
        im = Image.open(io.BytesIO(raw))
        im.verify()
        im = Image.open(io.BytesIO(raw))
        w, h = im.size
        fmt = (im.format or '').lower()
    except Exception:
        return None, 'bad_image', ''
    ext = {'jpeg': 'jpg', 'mpo': 'jpg', 'webp': 'webp', 'png': 'png'}.get(fmt)
    if not ext:
        return None, 'unsupported_type', f'{w}x{h}'
    if w < min_width:
        return None, 'below_min_width', f'{w}x{h}'
    digest = hashlib.sha1(raw).hexdigest()
    if digest in seen:
        return None, 'duplicate', f'{w}x{h}'
    seen.add(digest)
    d = os.path.join(out_root, slug(brand), slug(model))
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, f'{digest}.{ext}')
    if os.path.exists(path):
        return None, 'duplicate', f'{w}x{h}'
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        f.write(raw)
    os.replace(tmp, path)
    return path, 'ok', f'{w}x{h}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seeds', default=os.path.join(ROOT, 'scripts', 'catalog-seeds.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'data'))
    ap.add_argument('--log', default=os.path.join(ROOT, 'data', 'catalog-images-log.csv'))
    ap.add_argument('--min-width', type=int, default=1000)
    ap.add_argument('--delay', type=float, default=2.0)
    ap.add_argument('--limit-per-source', type=int, default=500)
    ap.add_argument('--max-per-job', type=int, default=5)
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()

    seen = set()
    if os.path.isdir(a.out):  # dedupe در برابر آرشیو موجود
        for r, _, fs in os.walk(a.out):
            for f in fs:
                b = f.split('.')[0]
                if re.fullmatch(r'[0-9a-f]{40}', b):
                    seen.add(b)

    jobs = json.load(open(a.seeds, encoding='utf-8'))
    last = defaultdict(float)
    blocked, counted, rows, summary = set(), defaultdict(int), [], defaultdict(int)
    sess = requests.Session()
    sess.headers.update(UA_HEADERS)

    def fetch(url, stream=False):
        host = urllib.parse.urlsplit(url).netloc
        gap = a.delay - (time.time() - last[host])
        if gap > 0:
            time.sleep(gap)
        last[host] = time.time()
        err, throttled = None, 0
        for back in [0, 2, 4, 8]:
            if back:
                time.sleep(back)
            try:
                r = sess.get(url, timeout=30, stream=stream)
            except requests.RequestException as e:
                err = f'{type(e).__name__}: {e}'
                continue
            if r.status_code == 403:
                blocked.add(host)  # ممنوعیت دائمی دامنه؛ ادامه بی‌فایده
                return None, 'blocked_403'
            if r.status_code == 429:  # محدودیت نرخ: cooldown، دامنه بلاک نمی‌شود
                throttled += 1
                if throttled >= 3:
                    blocked.add(host)
                    return None, 'blocked_429'
                wait = float(r.headers.get('Retry-After') or 0) or 30.0
                err = 'http_429'
                time.sleep(wait)
                continue
            if r.status_code == 200:
                return r, ''
            err = f'http_{r.status_code}'
        return None, err or 'http_error'

    def log(url, source, path, status, res):
        rows.append({'url': url, 'source': source, 'path': os.path.relpath(path, ROOT) if path else '',
                     'status': status, 'resolution': res})
        print(f'  [{source}] {status} {res} {url[:100]}', flush=True)

    for job in jobs:
        source, brand, model = job.get('source', '?'), job.get('brand', '?'), job.get('model', '?')
        if source in blocked:
            log(job.get('url', job.get('query', '')), source, None, 'source_blocked', '')
            continue
        urls = []

        if job.get('query'):  # Wikimedia Commons API (thumb 1600px: CDN-cached، بدون 429)
            q = {'action': 'query', 'generator': 'search', 'gsrsearch': job['query'],
                 'gsrnamespace': 6, 'gsrlimit': a.max_per_job, 'prop': 'imageinfo',
                 'iiprop': 'url|size|mime', 'iiurlwidth': max(a.min_width, 1600), 'format': 'json'}
            r, err = fetch('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(q))
            if r is None:
                log(job['query'], source, None, err, '')
                continue
            pages = (r.json().get('query') or {}).get('pages', {}).values()
            urls = [clean(ii.get('thumburl') or ii['url']) for p in pages if (ii := (p.get('imageinfo') or [{}])[0])
                    and ii.get('width', 0) >= a.min_width and 'image/' in ii.get('mime', 'image/')]
        elif job.get('mode') == 'page':
            r, err = fetch(job['url'])
            if r is None:
                log(job['url'], source, None, err, '')
                continue
            pats = [job['pattern']] if job.get('pattern') else PATTERNS
            found = []
            for p in pats:
                found += re.findall(p, r.text)
            urls = list(dict.fromkeys(found))[:a.max_per_job]  # ترتیب حفظ، بدون تکرار
            # نسخه اورجینال: حذف سافیکس thumb + query ریسایز (طبق sources.md §۳)
            urls = [re.sub(r'_thumb_\d+_\d+(\.\w+)?(\?.*)?$', r'\1', u) for u in urls]
        else:
            urls = [job['url']]

        for u in urls:
            if counted[source] >= a.limit_per_source:
                log(u, source, None, 'daily_cap', '')
                continue
            host = urllib.parse.urlsplit(u).netloc
            if host in blocked:
                log(u, source, None, 'source_blocked', '')
                continue
            r, err = fetch(u, stream=True)
            counted[source] += 1
            if r is None:
                log(u, source, None, err, '')
                continue
            raw = r.content
            path, status, res = save_bytes(raw, brand, model, a.out, a.min_width, seen)
            log(u, source, path, status, res)

    os.makedirs(os.path.dirname(a.log), exist_ok=True)
    with open(a.log, 'w', newline='', encoding='utf-8') as f:
        wr = csv.DictWriter(f, fieldnames=['url', 'source', 'path', 'status', 'resolution'])
        wr.writeheader()
        wr.writerows(rows)

    for row in rows:
        summary[(row['source'], row['status'])] += 1
    print(f'seeds={len(jobs)} rows={len(rows)} log={os.path.relpath(a.log, ROOT)}')
    for (src, st), n in sorted(summary.items()):
        print(f'  {src:12s} {st:18s} {n}')
    crit = [r for r in rows if r['status'] in ('bad_image', 'http_error')]
    filt = sum(1 for r in rows if r['status'] in ('below_min_width', 'unsupported_type'))
    print(f'filtered_out={filt}  critical_errors={len(crit)} (bad_image/http_error)')
    for c in crit[:10]:
        print('  !', c['status'], c['url'][:110])
    return 0


def self_test():
    from PIL import Image as I
    buf = io.BytesIO()
    I.new('RGB', (1200, 900), (30, 30, 30)).save(buf, 'JPEG')
    raw, seen = buf.getvalue(), set()
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        p, st, res = save_bytes(raw, 'Brand X', 'Model/Y', d, 1000, seen)
        assert st == 'ok' and res == '1200x900', (st, res)
        assert os.path.basename(p).endswith('.jpg') and os.path.getsize(p) == len(raw)
        assert os.path.basename(os.path.dirname(p)) == 'model-y', p
        assert save_bytes(raw, 'Brand X', 'Model/Y', d, 1000, seen)[1] == 'duplicate'
        small = io.BytesIO(); I.new('RGB', (800, 600)).save(small, 'JPEG')
        assert save_bytes(small.getvalue(), 'B', 'M', d, 1000, seen)[1] == 'below_min_width'
        assert save_bytes(b'not an image', 'B', 'M', d, 1000, seen)[1] == 'bad_image'
        assert slug('پژو ۲۰۷i') and len(slug('Dena Plus')) == len('dena-plus')
    print('self-test: 7 asserts OK')


if __name__ == '__main__':
    sys.exit(self_test() if '--self-test' in sys.argv else main())
