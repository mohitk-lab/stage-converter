#!/usr/bin/env python3
import argparse
import json
import re
import time
import sys
import urllib.request
import urllib.error
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASES_PATH = ROOT / 'benchmarks' / 'translation_quality_cases.json'
DEFAULT_API_URL = 'https://stage-converter-seven.vercel.app/api/convert'

HEURISTICS = {
    'haryanvi': {
        'forbidden': [r'\bनूं\b', r'\bजाणदा\b', r'\bछे\b', r'\bछूं\b'],
        'preferred_any': ['सै', 'सूं', 'इब्बै', 'तन्नै', 'कड़ै', 'रया', 'ल्यो', 'मन्नै', 'जइयो', 'रिया'],
    },
    'bhojpuri': {
        'forbidden': [r'\bसै\b', r'\bछे\b', r'\bकोनी\b'],
        'preferred_any': ['बा', 'बानी', 'रउरा', 'तोहार', 'केहू', 'अबहीं', 'गइल', 'बताईं', 'कइलऽ', 'जइहऽ', 'करिहऽ', 'होतऽ'],
    },
    'rajasthani': {
        'forbidden': [r'\bसै\b', r'\bसूं\b', r'\bबानी\b'],
        'preferred_any': ['छे', 'छूं', 'कोनी', 'म्हारो', 'थारो', 'कठै', 'अबार'],
    },
    'gujarati': {
        'forbidden': [r'[\u0900-\u097F]'],
        'preferred_any': ['અહીં', 'તમને', 'મળશે', 'હમણાં', 'હવે', 'કહેશો નહીં', 'ક્યાં', 'ગયો', 'રાહ', 'ઘરે', 'બારણું', 'જઈશ', 'કહી દીધું હોત'],
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
    last_exc = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as res:
                raw = res.read().decode()
                provider = res.headers.get('x-llm-provider')
            break
        except urllib.error.HTTPError as exc:
            last_exc = exc
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
        except Exception as exc:
            last_exc = exc
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    else:
        raise last_exc
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


def build_summary(report):
    totals = Counter(item["status"] for item in report)
    by_lang = defaultdict(lambda: Counter())
    issue_counter = Counter()
    weak_examples = defaultdict(list)

    for item in report:
        lang_id = item["langId"]
        by_lang[lang_id][item["status"]] += 1
        for issue in item.get("issues", []):
            issue_counter[(lang_id, issue)] += 1
        if item["status"] != "ok":
            weak_examples[lang_id].append(item)

    return {
        "totals": dict(totals),
        "by_lang": {lang: dict(counts) for lang, counts in by_lang.items()},
        "top_issues": [
            {"langId": lang, "issue": issue, "count": count}
            for (lang, issue), count in issue_counter.most_common(20)
        ],
        "weak_examples": {
            lang: items[:3]
            for lang, items in weak_examples.items()
        },
    }


def render_markdown_summary(summary):
    lines = ["# Translation Quality Benchmark Summary", ""]
    lines.append("## Totals")
    lines.append("")
    for status, count in summary["totals"].items():
        lines.append(f"- `{status}`: {count}")
    lines.append("")
    lines.append("## By Language")
    lines.append("")
    for lang, counts in sorted(summary["by_lang"].items()):
        stats = ", ".join(f"{k}={v}" for k, v in sorted(counts.items()))
        lines.append(f"- `{lang}`: {stats}")
    lines.append("")
    lines.append("## Top Issues")
    lines.append("")
    for item in summary["top_issues"]:
        lines.append(f"- `{item['langId']}`: `{item['issue']}` x {item['count']}")
    lines.append("")
    lines.append("## Weak Examples")
    lines.append("")
    for lang, items in sorted(summary["weak_examples"].items()):
        lines.append(f"### {lang}")
        for item in items:
            lines.append(f"- case `{item['case_id']}`")
            lines.append(f"  - source: {item.get('source', '')}")
            lines.append(f"  - output: {item.get('output', item.get('error', ''))}")
            issues = item.get("issues") or []
            if issues:
                lines.append(f"  - issues: {', '.join(issues)}")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("api_url", nargs="?", default=DEFAULT_API_URL)
    parser.add_argument("--json-out", dest="json_out")
    parser.add_argument("--md-out", dest="md_out")
    args = parser.parse_args()

    api_url = args.api_url
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
    summary = build_summary(report)
    payload = {
        "results": report,
        "summary": summary,
    }
    rendered = json.dumps(payload, ensure_ascii=False, indent=2)
    print(rendered)
    if args.json_out:
        Path(args.json_out).write_text(rendered)
    if args.md_out:
        Path(args.md_out).write_text(render_markdown_summary(summary))


if __name__ == '__main__':
    main()
