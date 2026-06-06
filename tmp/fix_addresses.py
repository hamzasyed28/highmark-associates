import re, sys, os

MAPS_URL = 'https://www.google.com/maps/search/?api=1&amp;query=Aslam+Business+Square+E-11%2F2+Markaz+Islamabad'

files_to_fix = [
    r'c:\hamza\Highmark Associates\index.html',
    r'c:\hamza\Highmark Associates\properties.html',
    r'c:\hamza\Highmark Associates\property-detail.html',
    r'c:\hamza\Highmark Associates\blog.html',
    r'c:\hamza\Highmark Associates\blog-post.html',
]

PATTERN = r'<span class="conf-address">(.*?)</span>'
REPLACEMENT = (
    '<a href="' + MAPS_URL + '" target="_blank" '
    'class="conf-address" style="color:var(--text-dim);text-decoration:none;">\\1</a>'
)

for fp in files_to_fix:
    if not os.path.exists(fp):
        print(f'Not found: {fp}')
        continue
    with open(fp, encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(PATTERN, REPLACEMENT, content, flags=re.DOTALL)
    if new_content != content:
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed: {os.path.basename(fp)}')
    else:
        print(f'No plain spans found: {os.path.basename(fp)}')
print('Done')
