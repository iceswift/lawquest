import glob
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

v2_en_files = glob.glob('data/legal-v2/texts/*/en/*.json')
for filepath in v2_en_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_sections = len(data['sections'])
    issues = []
    for s in data['sections']:
        txt = s.get('text', '').strip()
        status = s.get('status', 'active')
        if status == 'active':
            if not txt:
                issues.append((s['sectionNo'], "EMPTY"))
            elif len(txt) < 15 and not txt.startswith('See') and not txt.startswith('To') and not txt.startswith('Repealed'):
                issues.append((s['sectionNo'], f"SHORT: '{txt}'"))
            elif 'tbd' in txt.lower() or 'todo' in txt.lower() or 'pending' in txt.lower():
                issues.append((s['sectionNo'], f"PLACEHOLDER: '{txt}'"))
                
    print(f"File: {filepath}")
    print(f" - Total sections: {total_sections}")
    print(f" - Active sections with issues: {len(issues)}")
    for sec_no, issue in issues[:10]:
        print(f"   * Section {sec_no}: {issue}")
    if len(issues) > 10:
        print(f"   * ... and {len(issues) - 10} more issues")
