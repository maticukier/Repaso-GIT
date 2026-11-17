import json
import wm

def members(cat):
    q = '''SELECT ?item WHERE {
      SERVICE wikibase:mwapi {
        bd:serviceParam wikibase:endpoint "en.wikipedia.org"; wikibase:api "Generator"; mwapi:generator "categorymembers";
          mwapi:gcmtitle %s; mwapi:gcmlimit "max"; mwapi:gcmnamespace "0"; wikibase:limit 9000 .
        ?item wikibase:apiOutputItem mwapi:item .
      }
    }''' % json.dumps('Category:' + cat, ensure_ascii=False)
    return sorted({r['item']['value'].rsplit('/', 1)[1] for r in wm.sparql(q) if 'item' in r})
