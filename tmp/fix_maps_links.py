import re, os, sys

# === Exact Maps URLs ===
# Clickable link (opens in Google Maps app/browser)
CLICK_URL = (
    "https://www.google.com/maps/place/High+Mark+Associates,+F.E.C.H.S.+FECHS+E+11%2F2+E-11,"
    "+Islamabad,+44000/data=!4m2!3m1!1s0x38dfbd9ed70ade23:0x10c7b1bbf0f21d43!18m1!1e1"
    "?utm_source=mstt_1&entry=gps&coh=192189"
    "&g_ep=CAESBzI2LjIyLjQYACCenQoqgQEsOTQyNjc3MjcsOTQyOTIxOTUsOTQyOTk1MzIsMTAwNzk2"
    "NDk4LDEwMDc5Nzc2MSwxMDA3OTY1MzUsOTQyODA1NzYsOTQyMDczOTQsOTQyMDc1MDYsOTQyMDg1MDYs"
    "OTQyMTg2NTMsOTQyMjk4MzksOTQyNzUxNjgsOTQyNzk2MTlCAlBL"
    "&skid=d504259f-5119-4144-952f-fc9b73e2237a"
)

# HTML-entity safe version (for use inside href="" in HTML)
CLICK_URL_HTML = CLICK_URL.replace("&", "&amp;")

# Embed URL (for <iframe> — uses place_id extracted from the URL)
EMBED_URL = (
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3320.6157!2d72.9888!3d33.7215"
    "!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dfbd9ed70ade23%3A0x10c7b1bbf0f21d43"
    "!2sHigh%20Mark%20Associates!5e0!3m2!1sen!2spk!4v1717848195000"
)

ROOT = r"c:\hamza\Highmark Associates"

# === 1. Update all clickable Maps links in HTML files ===
OLD_HREFS = [
    "https://www.google.com/maps/search/?api=1&amp;query=Aslam+Business+Square+E-11%2F2+Markaz+Islamabad",
    "https://www.google.com/maps/search/?api=1&query=Aslam+Business+Square+E-11%2F2+Markaz+Islamabad",
    "https://maps.app.goo.gl/c1EBoHrjyGPf2HCM7",
]

html_files = [f for f in os.listdir(ROOT) if f.endswith(".html")]
total = 0
for fname in html_files:
    fp = os.path.join(ROOT, fname)
    with open(fp, encoding="utf-8") as f:
        content = f.read()
    new = content
    for old in OLD_HREFS:
        new = new.replace(old, CLICK_URL_HTML)
    if new != content:
        with open(fp, "w", encoding="utf-8") as f:
            f.write(new)
        print(f"  Links updated: {fname}")
        total += 1

# === 2. Update the iframe embed in contact.html ===
contact_fp = os.path.join(ROOT, "contact.html")
with open(contact_fp, encoding="utf-8") as f:
    content = f.read()

# Replace any existing maps embed src
new = re.sub(
    r'src="https://www\.google\.com/maps/embed\?[^"]*"',
    f'src="{EMBED_URL}"',
    content
)
if new != content:
    with open(contact_fp, "w", encoding="utf-8") as f:
        f.write(new)
    print("  Embed iframe updated: contact.html")

# === 3. Update main.js dynamic address handler ===
main_js = os.path.join(ROOT, "js", "main.js")
with open(main_js, encoding="utf-8") as f:
    content = f.read()
# Replace the dynamic maps query approach with exact URL
OLD_JS = (
    "            const q = encodeURIComponent(config.contact.address);\n"
    "            el.href = `https://www.google.com/maps/search/?api=1&query=${q}`;"
)
NEW_JS = f'            el.href = "{CLICK_URL}";'
new = content.replace(OLD_JS, NEW_JS)
if new != content:
    with open(main_js, "w", encoding="utf-8") as f:
        f.write(new)
    print("  Dynamic URL updated: main.js")

# === 4. Update blog-renderer.js dynamic address handler ===
br_js = os.path.join(ROOT, "js", "blog-renderer.js")
with open(br_js, encoding="utf-8") as f:
    content = f.read()
new = content.replace(OLD_JS, NEW_JS)
if new != content:
    with open(br_js, "w", encoding="utf-8") as f:
        f.write(new)
    print("  Dynamic URL updated: blog-renderer.js")

print(f"\nDone. {total} HTML file(s) had links updated.")
