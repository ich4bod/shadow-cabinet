from pathlib import Path
import subprocess
import yaml
rows=yaml.safe_load(Path('/home/ichabod/apps/ichabod-crane-net/data/creations.yaml').read_text())
found=[r for r in rows if r.get('url')=='https://shadow-cabinet.ichabod-crane.net']
assert len(found)==1, 'expected exactly one creations entry'
r=found[0]
assert r['name']=='Shadow Cabinet'
assert r['blurb']=='Move a lamp around scattered paper, find a creature in its shadow, and make one of your own.'
assert r['source']=='https://github.com/ich4bod/shadow-cabinet'
assert r['stack']=='Canvas · JavaScript'
assert str(r['built'])=='2026-10-05'
assert r['weight']==44
# Use the same public HTTP client accepted by the edge and verify-app.
html=subprocess.check_output(
    ['curl', '--fail', '--silent', '--show-error', '--location', '--max-time', '30',
     'https://ichabod-crane.net/creations/'], text=True)
assert 'https://shadow-cabinet.ichabod-crane.net' in html
assert 'Shadow Cabinet' in html
print('publication pass')
