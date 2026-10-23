import os
import json
import re
import time
import sys
import socket
from deep_translator import GoogleTranslator

# Set global socket timeout to 15 seconds to prevent hanging requests
socket.setdefaulttimeout(15)

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

CACHE_FILE = '.tmp/zh_translation_cache.json'
translation_cache = {}

if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            translation_cache = json.load(f)
        print(f"Loaded {len(translation_cache)} cached translations.")
    except Exception as e:
        print(f"Failed to load cache: {e}")

def save_cache():
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(translation_cache, f, ensure_ascii=False, indent=2)

def translate_section_label(thai_label):
    label = thai_label.strip()
    if label.startswith('มาตรา'):
        label = label[5:].strip()
    
    # Convert Thai digits to Arabic digits
    thai_digits = {
        '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
        '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
    }
    arabic_label = ''
    for char in label:
        if char in thai_digits:
            arabic_label += thai_digits[char]
        else:
            arabic_label += char
            
    # Suffixes
    suffixes = {
        'ทวิ': '之二',
        'ตรี': '之三',
        'จัตวา': '之四',
        'เบญจ': '之五',
        'ฉ': '之六',
        'สัตต': '之七',
        'อัฏฐ': '之八',
        'อัฎฐ': '之八',
        'นว': '之九',
        'ทศ': '之十',
        'เอกาทศ': '之十一',
        'ทวาทศ': '之十二',
        'เตรส': '之十三',
        'จตุทศ': '之十四',
        'ปัณรส': '之十五',
        'โสฬส': '之十六',
        'สัตตรส': '之十七',
        'อัฏฐารส': '之十八',
        'เอกูนวีสติ': '之十九'
    }
    
    for th_suffix, zh_suffix in suffixes.items():
        if arabic_label.endswith(th_suffix):
            arabic_label = arabic_label[:-len(th_suffix)].strip() + zh_suffix
            break
            
    return f"第{arabic_label}条"

def to_chinese_numeral(num_str):
    if not num_str.isdigit():
        return ""
    val = int(num_str)
    if val == 0:
        return "零"
    units = ["", "十", "百", "千"]
    digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
    
    res = ""
    if 10 <= val < 20:
        return "十" + (digits[val % 10] if val % 10 != 0 else "")
        
    temp = str(val)
    length = len(temp)
    for i, char in enumerate(temp):
        d = int(char)
        if d != 0:
            res += digits[d] + units[length - i - 1]
        else:
            if not res.endswith("零") and i != length - 1 and int(temp[i+1:]) != 0:
                res += "零"
    return res

def get_header_patterns(section_no):
    m = re.match(r'^([\d๐-๙]+)\s*(.*)$', section_no)
    if not m:
        thai_digits = {'๐':'0', '๑':'1', '๒':'2', '๓':'3', '๔':'4', '๕':'5', '๖':'6', '๗':'7', '๘':'8', '๙':'9'}
        sec_clean = ''.join(thai_digits.get(c, c) for c in section_no)
        m = re.match(r'^(\d+)\s*(.*)$', sec_clean)
        
    if m:
        digits_str = m.group(1)
        suffix_str = m.group(2).strip()
        
        thai_digits = {'๐':'0', '๑':'1', '๒':'2', '๓':'3', '๔':'4', '๕':'5', '๖':'6', '๗':'7', '๘':'8', '๙':'9'}
        digits_arabic = ''.join(thai_digits.get(c, c) for c in digits_str)
        digits_chinese = to_chinese_numeral(digits_arabic)
        
        suffixes_zh = {
            'ทวิ': '之二', 'ตรี': '之三', 'จัตวา': '之四', 'เบญจ': '之五',
            'ฉ': '之六', 'สัตต': '之七', 'อัฏฐ': '之八', 'อัฎฐ': '之八',
            'นว': '之九', 'ทศ': '之十',
            '/1': '之一', '/2': '之二', '/3': '之三', '/4': '之四', '/5': '之五',
            '/6': '之六', '/7': '之七', '/8': '之八', '/9': '之九', '/10': '之十',
            '-1': '之一', '-2': '之二', '-3': '之三', '-4': '之四', '-5': '之五'
        }
        suffix_zh_mapped = suffixes_zh.get(suffix_str, '')
        
        patterns = []
        # Generate patterns using both mapped suffix and raw suffix
        for suf in list(set([suffix_zh_mapped, suffix_str])):
            if suf:
                patterns.append(f"第{digits_arabic}{suf}条")
                patterns.append(f"第{digits_arabic}条{suf}")
                patterns.append(f"第{digits_arabic}{suf}條")
                patterns.append(f"第{digits_arabic}條{suf}")
                if digits_chinese:
                    patterns.append(f"第{digits_chinese}{suf}条")
                    patterns.append(f"第{digits_chinese}条{suf}")
                    patterns.append(f"第{digits_chinese}{suf}條")
                    patterns.append(f"第{digits_chinese}條{suf}")
            else:
                # If there's truly no suffix (not even a slash suffix)
                if not suffix_str:
                    patterns.append(f"第{digits_arabic}条")
                    patterns.append(f"第{digits_arabic}條")
                    if digits_chinese:
                        patterns.append(f"第{digits_chinese}条")
                        patterns.append(f"第{digits_chinese}條")
                        
        # English patterns
        suffixes_en = {
            'ทวิ': 'bis', 'ตรี': 'ter', 'จัตวา': 'quater', 'เบญจ': 'quinquies',
            'ฉ': 'sexies', 'สัตต': 'septies', 'อัฏฐ': 'octies', 'อัฎฐ': 'octies'
        }
        suffix_en = suffixes_en.get(suffix_str, suffix_str)
        if suffix_en:
            patterns.append(f"Section {digits_arabic} {suffix_en}")
            patterns.append(f"Section {digits_arabic}{suffix_en}")
        else:
            patterns.append(f"Section {digits_arabic}")
            
        patterns.append(f"มาตรา {digits_str}")
        if suffix_str:
            patterns.append(f"มาตรา {digits_str} {suffix_str}")
            
        return patterns
    return []

def post_process_translation(text, section_no=None):
    if not text:
        return ''
    
    # Strip hallucinated current section header
    if section_no:
        patterns = get_header_patterns(section_no)
        for pat in patterns:
            if text.lower().startswith(pat.lower()):
                text = text[len(pat):].strip()
                text = re.sub(r'^[\s.:-]*', '', text)
                break
                
    # Specific override for Section 1274 to add missing "To/Until" translation and preserve reference
    if "1297[119]" in text and ("第" in text or "条" in text):
        text = "至第1297[119]条（已废止）"

    # Wordings mapping
    text = text.replace("犯罪者", "任何人")
    text = text.replace("凡是", "任何人")
    text = text.replace("任何个人", "任何人")
    text = text.replace("任何人都", "任何人")
    text = text.replace("任何人只要", "任何人")
    
    text = text.replace("应处以", "应处")
    
    # Imprisonment formatting
    text = re.sub(r'不超过\s*(\d+|[\u4e00-\u4e5d\u5341\u767e\u5343\u4e07]+)\s*(年|个月|天)\s*(的)?(监禁|徒刑|有期徒刑|处刑|有期徒刑徒刑|拘留|坐牢)', r'不超过\1\2的有期徒刑', text)
    text = re.sub(r'处\s*(\d+|[\u4e00-\u4e5d\u5341\u767e\u5343\u4e07]+)\s*(年|个月|天)\s*(的)?(监禁|徒刑|有期徒刑|处刑)', r'处不超过\1\2的有期徒刑', text)
    text = re.sub(r'监禁不超过\s*(\d+|[\u4e00-\u4e5d\u5341\u767e\u5343\u4e07]+)\s*(年|个月|天)', r'不超过\1\2的有期徒刑', text)

    # Fine formatting
    text = re.sub(r'不超过\s*(\d+|[\u4e00-\u4e5d\u5341\u767e\u5343\u4e07\s,]+)\s*泰铢\s*(的)?(罚款|处罚|罚金)', r'不超过\1泰铢的罚金', text)
    text = re.sub(r'罚款不超过\s*(\d+|[\u4e00-\u4e5d\u5341\u767e\u5343\u4e07\s,]+)\s*泰铢', r'不超过\1泰铢的罚金', text)
    
    # both
    text = text.replace("或两者并罚", "或并处罚金")
    text = text.replace("或双重处罚", "或并处罚金")
    text = text.replace("或两者兼施", "或并处罚金")
    text = text.replace("或并处上述两项处罚", "或并处罚金")
    text = text.replace("或并处有期徒刑和罚金", "或并处罚金")
    text = text.replace("或并处罚款", "或并处罚金")
    
    # Life/Death
    text = text.replace("终身监禁", "无期徒刑")
    text = text.replace("终身徒刑", "无期徒刑")
    text = text.replace("处死", "死刑")
    text = text.replace("死刑处罚", "死刑")
    
    # Repealed
    text = text.replace("(已废止)", "（已废止）")
    text = text.replace("（已废止）.", "（已废止）")
    
    # Internal references translation
    # E.g. "第 45 条" -> "第45条", "第3条之二"
    text = re.sub(r'第\s*(\d+)\s*条', r'第\1条', text)
    text = re.sub(r'มาตรา\s*([๐-๙\d]+)', lambda m: f"第{''.join({'๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'}.get(c, c) for c in m.group(1))}条", text)

    # Clean double puncts
    text = text.replace("。。", "。")
    text = text.replace(" ，", "，")
    text = text.replace(" ；", "；")
    text = text.replace(" 。", "。")
    
    # Archaic pronouns & translation cleanups
    text = text.replace("他说的", "其")
    text = text.replace("他说的，", "")
    text = text.replace("他说，", "")
    text = text.replace("他说", "")
    text = text.replace("他表示，", "")
    text = text.replace("他表示", "")
    text = text.replace("他认为，", "")
    text = text.replace("他认为", "")
    text = text.replace("他将", "")
    text = text.replace("他判处他", "处")
    text = text.replace("他判处", "处")
    text = text.replace("他将判处", "处")
    text = text.replace("判处他", "处")
    text = text.replace("他给他", "处")
    text = text.replace("你就抓住了我", "被逮捕")
    text = text.replace("你就抓住他", "被逮捕")
    text = text.replace("抓到他", "逮捕他")
    text = text.replace("你就", "")
    text = text.replace("他就让他", "应予")
    text = text.replace("他就让", "应予")
    text = text.replace("让他", "予以")
    text = text.replace("你就把他", "将其")
    text = text.replace("你把他", "将其")
    text = text.replace("您确定", "所规定")
    text = text.replace("枪杀", "枪决")
    text = text.replace("判死刑", "判处死刑")
    text = text.replace("判无期徒刑", "判处无期徒刑")
    text = text.replace("判有期徒刑", "判处有期徒刑")
    text = text.replace("被判死刑", "被判处死刑")
    text = text.replace("被判无期徒刑", "被判处无期徒刑")
    text = text.replace("被判有期徒刑", "被判处有期徒刑")
    
    text = text.replace("就这样吧。", "该案即告平息。")
    text = text.replace("就这样吧", "该案即告平息")
    text = text.replace("就此平息。", "该案即告平息。")
    
    # Clean double puncts again
    text = text.replace("。。", "。")
    text = text.replace(" ，", "，")
    text = text.replace(" ；", "；")
    text = text.replace(" 。", "。")
    
    # Clean up leading/trailing debris from pronoun replacements
    text = re.sub(r'^的惩罚', '其惩罚', text)
    text = re.sub(r'^惩罚是', '应处', text)

    return text.strip()

def translate_text(text, cache_key):
    if not text or text.strip() == '':
        return ''
    
    if cache_key in translation_cache:
        return translation_cache[cache_key]
        
    # Normalize carriage returns
    normalized_text = text.replace('\r\n', '\n')
    # Split text into paragraphs first
    paragraphs = [p.strip() for p in normalized_text.split('\n\n') if p.strip()]
    
    # Group paragraphs into chunks of maximum 1200 characters to stay safe with GET URL limit
    chunks = []
    current_chunk = []
    current_length = 0
    
    for p in paragraphs:
        # Check if adding this paragraph exceeds the chunk limit (plus 2 for \n\n separator)
        if current_chunk and current_length + len(p) + 2 > 1200:
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = [p]
            current_length = len(p)
        else:
            current_chunk.append(p)
            current_length += len(p) + (2 if current_chunk else 0)
            
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))
        
    translated_chunks = []
    for idx, chunk in enumerate(chunks):
        max_retries = 8
        translated_c = None
        for attempt in range(max_retries):
            try:
                translated_c = GoogleTranslator(source='th', target='zh-CN').translate(chunk)
                time.sleep(1.0)  # Polite delay between chunk translations
                break
            except Exception as e:
                wait_time = min(300, (2 ** attempt) * 5)
                print(f"  [Attempt {attempt + 1}/{max_retries}] Chunk {idx} translation failed: {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                
        if translated_c is None:
            raise Exception(f"Failed to translate chunk {idx} of {cache_key} after {max_retries} retries.")
            
        translated_chunks.append(translated_c)
        
    # Join with double newlines
    joined_translation = '\n\n'.join(translated_chunks)
    translation_cache[cache_key] = joined_translation
    save_cache()
    return joined_translation

# Custom Display Labels for Appendices
appendix_labels = {
    'thai-civil-procedure-code-appendix-table-1': '表一：法庭规费（起诉规费）',
    'thai-civil-procedure-code-appendix-table-2': '表二：法庭规费（其他规费）',
    'thai-civil-procedure-code-appendix-table-3': '表三：庭外调查取证费',
    'thai-civil-procedure-code-appendix-table-4': '表四：证人津贴、交通费、住宿费及测绘图费',
    'thai-civil-procedure-code-appendix-table-5': '表五：执法人员规费',
    'thai-civil-procedure-code-appendix-table-6': '表六：律师费',
    'thai-civil-procedure-code-appendix-table-7': '表七：诉讼开支',
    'thai-criminal-procedure-code-appendix-offence-schedule': '刑事诉讼法典附表：罪行分类表',
    'thai-land-code-appendix-fee-schedule': '附于土地法典的费用及开支费率表',
    'thai-land-code-appendix-compensation-schedule': '附于土地法典的补偿率表',
    'thai-narcotics-code-appendix-fee-schedule': '规费费率表',
    'thai-revenue-code-appendix-stamp-duty-schedule': '印花税税率表'
}

targets = [
    {
        'codeId': 'thai-military-criminal-code',
        'thFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-military-criminal-code/th/th-ocs-2026-06-06.json',
        'zhDir': 'D:/Project/LawQuest/data/legal-v3/texts/thai-military-criminal-code/zh-CN',
        'zhFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-military-criminal-code/zh-CN/zh-cn-ai-draft-2026-06-07.json'
    },
    {
        'codeId': 'thai-land-code',
        'thFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-land-code/th/th-ocs-2026-06-06.json',
        'zhDir': 'D:/Project/LawQuest/data/legal-v3/texts/thai-land-code/zh-CN',
        'zhFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-land-code/zh-CN/zh-cn-ai-draft-2026-06-07.json'
    },
    {
        'codeId': 'thai-narcotics-code',
        'thFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-narcotics-code/th/th-ocs-2026-06-06.json',
        'zhDir': 'D:/Project/LawQuest/data/legal-v3/texts/thai-narcotics-code/zh-CN',
        'zhFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-narcotics-code/zh-CN/zh-cn-ai-draft-2026-06-07.json'
    },
    {
        'codeId': 'thai-criminal-procedure-code',
        'thFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-procedure-code/th/th-ocs-2026-06-06.json',
        'zhDir': 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-procedure-code/zh-CN',
        'zhFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-procedure-code/zh-CN/zh-cn-ai-draft-2026-06-07.json'
    },
    {
        'codeId': 'thai-criminal-code',
        'thFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-code/th/th-ocs-2026-06-06.json',
        'zhDir': 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-code/zh-CN',
        'zhFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-code/zh-CN/zh-cn-ai-draft-2026-06-07.json'
    },
    {
        'codeId': 'thai-revenue-code',
        'thFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-revenue-code/th/th-ocs-2026-06-06.json',
        'zhDir': 'D:/Project/LawQuest/data/legal-v3/texts/thai-revenue-code/zh-CN',
        'zhFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-revenue-code/zh-CN/zh-cn-ai-draft-2026-06-07.json'
    },
    {
        'codeId': 'thai-civil-procedure-code',
        'thFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-procedure-code/th/th-ocs-2026-06-06.json',
        'zhDir': 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-procedure-code/zh-CN',
        'zhFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-procedure-code/zh-CN/zh-cn-ai-draft-2026-06-07.json'
    },
    {
        'codeId': 'thai-civil-commercial-code',
        'thFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-commercial-code/th/th-ocs-2026-06-06.json',
        'zhDir': 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-commercial-code/zh-CN',
        'zhFile': 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-commercial-code/zh-CN/zh-cn-ai-draft-2026-06-07.json'
    }
]

def translate_code(target):
    code_id = target['codeId']
    th_file = target['thFile']
    zh_dir = target['zhDir']
    zh_file = target['zhFile']
    
    print(f"\n========================================")
    print(f"Translating {code_id}...")
    
    if not os.path.exists(th_file):
        print(f"Error: Thai source file not found at {th_file}")
        sys.exit(1)
        
    with open(th_file, 'r', encoding='utf-8') as f:
        th_data = json.load(f)
        
    zh_sections = []
    for idx, th_sec in enumerate(th_data['sections']):
        section_id = th_sec['sectionId']
        section_no = th_sec['sectionNo']
        section_label = translate_section_label(th_sec['sectionLabel'])
        
        status = th_sec['status']
        if status == 'repealed':
            text = '（已废止）'
        else:
            cache_key = f"{code_id}::sec::{section_id}"
            # if cache_key not in translation_cache:
            #     print(f"  Translating section {section_no}...")
            pass
            text = translate_text(th_sec['text'], cache_key)
            text = post_process_translation(text, section_no)
            
        zh_sections.append({
            "sectionId": section_id,
            "sectionNo": section_no,
            "sectionLabel": section_label,
            "headingFootnoteRefs": list(th_sec['headingFootnoteRefs']),
            "text": text,
            "bodyFootnoteRefs": list(th_sec['bodyFootnoteRefs']),
            "status": status,
            "translationStatus": "draft",
            "reviewStatus": "needs_legal_review",
            "needsReview": False,
            "reviewNotes": []
        })
        
        # Log progress every 100 sections
        if (idx + 1) % 100 == 0:
            print(f"  Translated {idx + 1}/{len(th_data['sections'])} sections...")
            
    zh_appendices = []
    for th_app in th_data.get('appendices', []):
        appendix_id = th_app['appendixId']
        label = appendix_labels.get(appendix_id, th_app['label'])
        
        cache_key = f"{code_id}::app::{appendix_id}"
        # if cache_key not in translation_cache:
        #     print(f"  Translating appendix {appendix_id}...")
        pass
        text = translate_text(th_app['text'], cache_key)
        text = post_process_translation(text)
        
        zh_appendices.append({
            "appendixId": appendix_id,
            "label": label,
            "headingFootnoteRefs": list(th_app['headingFootnoteRefs']),
            "text": text,
            "bodyFootnoteRefs": list(th_app['bodyFootnoteRefs']),
            "translationStatus": "draft",
            "reviewStatus": "needs_legal_review",
            "needsReview": False,
            "reviewNotes": []
        })
        
    output = {
        "schemaVersion": 3,
        "codeId": code_id,
        "language": "zh-CN",
        "versionId": "zh-cn-ai-draft-2026-06-07",
        "basedOnVersionId": th_data['versionId'],
        "sourceType": "ai_assisted_draft_with_reference",
        "translationStatus": "draft",
        "reviewStatus": "needs_legal_review",
        "isAuthoritative": False,
        "disclaimer": "This Simplified Chinese translation is AI-assisted and provided for learning and reference only. The Thai text remains the sole authoritative legal text.",
        "sections": zh_sections,
        "appendices": zh_appendices
    }
    
    # 17-Point Validation
    print("Running validation checks...")
    errors = []
    
    if output['schemaVersion'] != 3:
        errors.append(f"schemaVersion is not 3: {output['schemaVersion']}")
    if output['codeId'] != th_data['codeId']:
        errors.append(f"codeId mismatch: expected {th_data['codeId']}, got {output['codeId']}")
    if output['language'] != 'zh-CN':
        errors.append(f"language is not zh-CN: {output['language']}")
    if output['basedOnVersionId'] != th_data['versionId']:
        errors.append(f"basedOnVersionId mismatch: expected {th_data['versionId']}, got {output['basedOnVersionId']}")
    if len(output['sections']) != len(th_data['sections']):
        errors.append(f"Section count mismatch: expected {len(th_data['sections'])}, got {len(output['sections'])}")
    if len(output['appendices']) != len(th_data.get('appendices', [])):
        errors.append(f"Appendix count mismatch: expected {len(th_data.get('appendices', []))}, got {len(output['appendices'])}")
        
    for i, th_sec in enumerate(th_data['sections']):
        zh_sec = output['sections'][i]
        
        if zh_sec['sectionId'] != th_sec['sectionId']:
            errors.append(f"sectionId mismatch at index {i}")
        if zh_sec['sectionNo'] != th_sec['sectionNo']:
            errors.append(f"sectionNo mismatch at index {i}")
        if list(zh_sec['headingFootnoteRefs']) != list(th_sec['headingFootnoteRefs']):
            errors.append(f"headingFootnoteRefs mismatch at section {th_sec['sectionNo']}")
        if list(zh_sec['bodyFootnoteRefs']) != list(th_sec['bodyFootnoteRefs']):
            errors.append(f"bodyFootnoteRefs mismatch at section {th_sec['sectionNo']}")
        header_patterns = get_header_patterns(zh_sec['sectionNo'])
        for pat in header_patterns:
            if zh_sec['text'].startswith(pat):
                errors.append(f"Section {zh_sec['sectionNo']} text starts with header pattern '{pat}': {zh_sec['text'][:20]}")
                break
        if zh_sec['text'].startswith('[') and ']' in zh_sec['text'][:10]:
            errors.append(f"Section {zh_sec['sectionNo']} text starts with heading footnote marker: {zh_sec['text'][:20]}")
        if re.search(r'\[\d+\]\s*[\u4e00-\u9fa5]+', zh_sec['text']):
            # Verify it's not a heading footnote pattern like "[132] 任何人"
            # Note: valid body footnotes like "任何人[5]" are allowed, but "[132] 任何人" is heading footnote error
            if zh_sec['text'].startswith('[') and ']' in zh_sec['text'][:10]:
                errors.append(f"Section {zh_sec['sectionNo']} has heading footnote at start of text")
        if not zh_sec['text'] or zh_sec['text'].strip() == '':
            errors.append(f"Section {zh_sec['sectionNo']} is missing text")
            
    for i, th_app in enumerate(th_data.get('appendices', [])):
        zh_app = output['appendices'][i]
        if zh_app['appendixId'] != th_app['appendixId']:
            errors.append(f"appendixId mismatch at index {i}")
        if list(zh_app['headingFootnoteRefs']) != list(th_app['headingFootnoteRefs']):
            errors.append(f"appendix headingFootnoteRefs mismatch at index {i}")
        if list(zh_app['bodyFootnoteRefs']) != list(th_app['bodyFootnoteRefs']):
            errors.append(f"appendix bodyFootnoteRefs mismatch at index {i}")
        if not zh_app['text'] or zh_app['text'].strip() == '':
            errors.append(f"Appendix {zh_app['appendixId']} is missing text")
            
    if errors:
        print(f"Validation FAILED with {len(errors)} error(s):")
        for err in errors[:10]:
            print(f" - {err}")
        if len(errors) > 10:
            print(f" ... and {len(errors) - 10} more error(s)")
        sys.exit(1)
        
    print("Validation PASSED!")
    
    # Save output
    os.makedirs(zh_dir, exist_ok=True)
    with open(zh_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"Saved output to {zh_file}")
    
    # Report stats
    empty_text_count = sum(1 for s in output['sections'] if not s['text'] or s['text'].strip() == '')
    needs_review_count = sum(1 for s in output['sections'] if s['needsReview'])
    
    print("\n--- Final Report Details ---")
    print(f"codeId: {output['codeId']}")
    print(f"Thai versionId: {th_data['versionId']}")
    print(f"Chinese versionId: {output['versionId']}")
    print(f"target file path: {zh_file}")
    print(f"total sections: {len(output['sections'])}")
    print(f"total appendices: {len(output['appendices'])}")
    print(f"sectionId mismatches: 0")
    print(f"sectionNo mismatches: 0")
    print(f"headingFootnoteRefs mismatches: 0")
    print(f"bodyFootnoteRefs mismatches: 0")
    print(f"appendixId mismatches: 0")
    print(f"empty text count: {empty_text_count}")
    print(f"needsReview count: {needs_review_count}")
    print(f"validation result: PASS")

def main():
    print("Starting translation of all 8 Thai legal codes into Simplified Chinese...")
    # Translate smaller codes first to build up cache and verify quickly
    # 1. Military Criminal Code (53 sections)
    # 2. Land Code (140 sections)
    # 3. Narcotics Code (186 sections)
    # 4. Revenue Code (332 sections)
    # 5. Criminal Procedure Code (325 sections)
    # 6. Criminal Code (448 sections)
    # 7. Civil Procedure Code (474 sections)
    # 8. Civil & Commercial Code (1849 sections)
    for target in targets:
        translate_code(target)
    print("\nAll 8 codes have been translated and validated successfully!")

if __name__ == '__main__':
    main()
