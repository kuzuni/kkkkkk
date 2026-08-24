import json, time, sys
SP='/tmp/claude-0/-home-user-kkkkkk/76727d9b-735b-5f40-ba4f-3f53f583b813/tasks/'
F=['aff2a2069c8ef0151.output','a3c71657b739040f9.output']
def done(f):
    try:
        for line in open(SP+f, encoding='utf-8', errors='replace'):
            line=line.strip()
            if not line: continue
            try: o=json.loads(line)
            except Exception: continue
            if o.get('type')!='assistant': continue
            c=(o.get('message') or {}).get('content')
            if isinstance(c,list):
                for b in c:
                    if isinstance(b,dict) and b.get('type')=='text' and '최저:' in b.get('text',''):
                        return True
    except FileNotFoundError:
        return False
    return False
for i in range(90):
    d=[done(f) for f in F]
    if all(d):
        print('CRITICS DONE'); sys.exit(0)
    time.sleep(20)
print('CRITICS TIMEOUT', d)
