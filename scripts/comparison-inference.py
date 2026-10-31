"""One local model per arm, using the same inference settings for both."""
import sys, json, contextlib
with contextlib.redirect_stdout(sys.stderr):
    import mlx.core as mx
    from mlx_lm import load, generate
    from mlx_lm.sample_utils import make_sampler
    model, tokenizer = load(sys.argv[1], adapter_path=sys.argv[2] if len(sys.argv) > 2 else None)
print(json.dumps({'ready': True}), flush=True)
for line in sys.stdin:
    try:
        request = json.loads(line)
        mx.random.seed(request['seed'])
        with contextlib.redirect_stdout(sys.stderr):
            output = generate(model, tokenizer, prompt=request['prompt'], max_tokens=256, sampler=make_sampler(temp=0), verbose=False)
        print(json.dumps({'text': output}), flush=True)
        mx.clear_cache()
    except Exception as error:
        print(json.dumps({'error': str(error)[:200]}), flush=True)
