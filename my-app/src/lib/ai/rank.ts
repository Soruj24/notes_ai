/**
 * Lexical relevance ranker behind the semantic_search tool contract.
 * Token-overlap scoring with title weighting and recency tie-break.
 * Dependency-free so it stays unit-testable; a vector backend can replace
 * rankHits() without touching tools, services, or the agent.
 */

export interface Rankable {
  title: string;
  body?: string;
  updatedAt?: string | Date;
}

export interface Ranked<T extends Rankable> {
  item: T;
  score: number;
}

const STOP_WORDS = new Set(
  "a,an,the,and,or,but,of,to,in,on,for,with,my,me,is,are,was,were,be,do,does,show,get,find,all,any,by,at,from,that,this,it,as".split(","),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function scoreHit(query: string, item: Rankable): number {
  const terms = new Set(tokenize(query));
  if (!terms.size) return 0;
  const titleTokens = tokenize(item.title);
  const bodyTokens = tokenize(item.body ?? "");
  let score = 0;
  for (const term of terms) {
    const inTitle = titleTokens.filter((t) => t === term || t.startsWith(term)).length;
    const inBody = bodyTokens.filter((t) => t === term || t.startsWith(term)).length;
    score += inTitle * 3 + Math.min(inBody, 5);
  }
  return score;
}

/** Rank hits by relevance; recency breaks ties. Zero-score items drop out. */
export function rankHits<T extends Rankable>(query: string, items: T[]): Array<Ranked<T>> {
  return items
    .map((item) => ({ item, score: scoreHit(query, item) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const at = a.item.updatedAt ? new Date(a.item.updatedAt).getTime() : 0;
      const bt = b.item.updatedAt ? new Date(b.item.updatedAt).getTime() : 0;
      return bt - at;
    });
}
