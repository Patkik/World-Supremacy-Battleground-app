"""Local, dependency-free workspace retrieval and task graph inspection."""
import argparse
import hashlib
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AREAS = ('memory', 'docs', 'agents', 'workflows', '.agents/skills')


def sources(root):
    result = []
    for area in AREAS:
        base = root / area
        for p in base.rglob('*'):
            if p.is_file() and p.suffix in ('.md', '.txt', '.json'):
                if any(x.is_symlink() for x in [p, *p.parents]):
                    continue
                if p.resolve().is_relative_to(root.resolve()):
                    result.append(p)
    return sorted(result)


def fingerprint(root):
    h = hashlib.sha256()
    for p in sources(root):
        h.update(p.relative_to(root).as_posix().encode())
        h.update(p.read_bytes())
    return h.hexdigest()


def tokens(text):
    return re.findall(r'[a-z0-9]{2,}', text.lower())


def vector(text, idf):
    counts = Counter(tokens(text))
    values = {t: (1 + math.log(n)) * idf[t] for t, n in counts.items() if t in idf}
    norm = math.sqrt(sum(v*v for v in values.values()))
    return {t: v / norm for t, v in values.items()} if norm else {}


def build(root):
    chunks = []
    for p in sources(root):
        lines = p.read_text(encoding='utf-8-sig').splitlines()
        # Bound chunks even for the pasted brief's very long source lines.
        pending, start = [], 1
        for number, line in enumerate(lines, 1):
            for offset in range(0, max(1, len(line)), 1400):
                part = line[offset:offset+1400]
                if pending and sum(len(v) for v in pending) + len(part) > 1800:
                    chunks.append(dict(path=p.relative_to(root).as_posix(), start=start,
                                       end=number, text='\n'.join(pending)))
                    pending = []
                if not pending:
                    start = number
                pending.append(part)
        if pending:
            chunks.append(dict(path=p.relative_to(root).as_posix(), start=start,
                               end=len(lines), text='\n'.join(pending)))
    df = Counter(t for c in chunks for t in set(tokens(c['text'])))
    idf = {t: math.log((1 + len(chunks))/(1 + n)) + 1 for t, n in df.items()}
    for c in chunks:
        c['vector'] = vector(c['text'], idf)
    data = dict(version=1, method='tfidf-cosine', fingerprint=fingerprint(root), idf=idf, chunks=chunks)
    target = root / '.workspace/index.json'
    target.parent.mkdir(exist_ok=True)
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(data), encoding='utf-8')
    temp.replace(target)
    return data


def search(root, query, limit=5):
    target = root / '.workspace/index.json'
    try:
        data = json.loads(target.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        data = {}
    if data.get('version') != 1 or data.get('fingerprint') != fingerprint(root):
        data = build(root)
    q = vector(query, data['idf'])
    hits = []
    for c in data['chunks']:
        score = sum(v*c['vector'].get(t, 0) for t, v in q.items())
        if score > 0:
            hits.append({k: v for k, v in c.items() if k != 'vector'} | {'score': round(score, 4)})
    return sorted(hits, key=lambda x: -x['score'])[:limit]


def validate_dag(tasks):
    by_id = {t['id']: t for t in tasks}
    if len(by_id) != len(tasks):
        raise ValueError('Duplicate task IDs')
    visiting, visited, order = set(), set(), []
    def visit(key):
        if key in visiting:
            raise ValueError('Dependency cycle at ' + key)
        if key in visited:
            return
        if key not in by_id:
            raise ValueError('Unknown dependency: ' + key)
        task = by_id[key]
        if task['status'] not in ('todo', 'in_progress', 'blocked', 'done'):
            raise ValueError('Invalid status: ' + key)
        if task['status'] == 'done' and not task.get('evidence'):
            raise ValueError('Completed task lacks evidence: ' + key)
        visiting.add(key)
        for dep in task['depends_on']:
            visit(dep)
            if task['status'] in ('done', 'in_progress') and by_id[dep]['status'] != 'done':
                raise ValueError('Unfinished dependency for ' + key)
        visiting.remove(key)
        visited.add(key)
        order.append(key)
    for key in by_id:
        visit(key)
    ready = [key for key in order if by_id[key]['status'] == 'todo'
             and all(by_id[d]['status'] == 'done' for d in by_id[key]['depends_on'])]
    return dict(order=order, ready=ready)


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['index', 'search', 'dag', 'check'])
    parser.add_argument('query', nargs='?', default='')
    args = parser.parse_args()
    try:
        if args.command == 'index':
            data = build(ROOT)
            print(f"Indexed {len(data['chunks'])} source chunks with local TF-IDF vectors.")
        elif args.command == 'search':
            if not args.query.strip():
                parser.error('search requires a query')
            print(json.dumps(search(ROOT, args.query), indent=2, ensure_ascii=False))
        else:
            tasks = json.loads((ROOT / 'workflows/tasks.json').read_text(encoding='utf-8'))['tasks']
            result = validate_dag(tasks)
            if args.command == 'check':
                for p in (ROOT / '.agents/skills').glob('*/SKILL.md'):
                    body = p.read_text(encoding='utf-8')
                    if not body.startswith('---\nname: ' + p.parent.name + '\n') or '\ndescription: ' not in body:
                        raise ValueError('Invalid skill metadata: ' + str(p))
                result['skills_checked'] = len(list((ROOT / '.agents/skills').glob('*/SKILL.md')))
            print(json.dumps(result, indent=2))
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
