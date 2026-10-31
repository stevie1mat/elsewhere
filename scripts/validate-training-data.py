import json, sys
from pathlib import Path
from transformers import AutoTokenizer
model, data, maximum = sys.argv[1], Path(sys.argv[2]), int(sys.argv[3])
tokenizer = AutoTokenizer.from_pretrained(model, local_files_only=True)
counts = {}
for split in ('train', 'valid'):
    rows = [json.loads(line) for line in (data / f'{split}.jsonl').read_text().splitlines() if line.strip()]
    if not rows:
        raise SystemExit(f'{split} is empty')
    for row in rows:
        length = len(tokenizer.encode(row['prompt'] + row['completion'], add_special_tokens=False))
        if length > maximum:
            raise SystemExit(f'{split} example has {length} tokens; limit {maximum}. Refusing to truncate the answer.')
    counts[split] = len(rows)
print(json.dumps(counts))
