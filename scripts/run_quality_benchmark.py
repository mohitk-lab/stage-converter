#!/usr/bin/env python3
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASES_PATH = ROOT / 'benchmarks' / 'translation_quality_cases.json'
DEFAULT_API_URL = 'https://stage-converter-seven.vercel.app/api/convert'

HEURISTICS = {
    'haryanvi': {
        'forbidden': [r'\bनूं\b', r'\bजाणदा\b', r'\bछे\b', r'\bछूं\b'],
        'preferred_any': ['सै', 'सूं', 'इब्बै', 'तन्नै', 'कड़ै', 'रया', 'ल्यो'],
    },
    'bhojpuri': {
        'forbidden': [r'\bसै\b', r'\bछे\b', r'\bकोनी\b'],
        'preferred_any': ['बा', 'बानी', 'रउरा', 'तोहार', 'केहू', 'अबहीं', 'गइल', 'बताईं'],
    },
    'rajasthani': {
        'forbidden': [r'\bसै\b', r'\bसूं\b', r'\bबानी\b'],
        'preferred_any': ['छे', 'छूं', 'कोनी', 'म्हारो', 'थारो', 'कठै', 'अबार'],
    },
    'gujarati': {
        'forbidden': [r'[\u0900-\u097F]'],
        'preferred_any': ['અહીં', 'તમને', 'મળશે', 'હમણાં', 'કહેશો નહીં', 'ક્યાં', 'ગયો'],
    },
}


def call_api(api_url: str, lang_id: str, source: str):
    system = (
        f'You are an expert translator for {lang_id}. '
        f'Translate the input into natural {lang_id}. '
        'Output only translation. CRITICAL OUTPUT RULES FINAL CHECKLIST'
    )
    body = {
        'model': 'anthropic/claude-sonnet-4.5',
        'system': system,
        'messages': [{'role': 'user', 'content': source}],
        'stream': False,
        'langId': lang_id,
    }
    req = urllib.request.Request(
        api_url,
        data=json.dumps(body).encode(),
        headers={'content-type': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        raw = res.read().decode()
        provider = res.headers.get('x-llm-provider')
    output_parts = []
    for line in raw.splitlines():
        if not line.startswith('data: '):
            continue
        payload = line[6:]
        if payload == '[DONE]':
            break
        try:
            obj = json.loads(payload)
        except Exception:
            continue
        for choice in obj.get('choices', []):
            content = choice.get('delta', {}).get('content')
            if content:
                output_parts.append(content)
    return provider, ''.join(output_parts).strip()


def score_output(lang_id: str, output: str):
    rules = HEURISTICS.get(lang_id, {})
    issues = []
    for pattern in rules.get('forbidden', []):
        if re.search(pattern, output):
            issues.append(f'forbidden:{pattern}')
    preferred = rules.get('preferred_any', [])
    if preferred and not any(token in output for token in preferred):
        issues.append('missing_preferred_markers')
    return issues


def main():
    api_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_API_URL
    cases = json.loads(CASES_PATH.read_text())
    report = []
    for case in cases:
        for lang_id in case['langs']:
            try:
                provider, output = call_api(api_url, lang_id, case['source'])
                issues = score_output(lang_id, output)
                report.append({
                    'case_id': case['id'],
                    'langId': lang_id,
                    'provider': provider,
                    'source': case['source'],
                    'output': output,
                    'issues': issues,
                    'status': 'ok' if not issues else 'needs_review',
                })
            except Exception as exc:
                report.append({
                    'case_id': case['id'],
                    'langId': lang_id,
                    'status': 'error',
                    'error': str(exc),
                })
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
