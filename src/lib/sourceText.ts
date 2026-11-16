/**
 * Source fields in the data mix words and a link, e.g.
 * "https://x.pdf (p.27: Pinal AMA ...)" or "UA budget: water $70/AF. https://...".
 * Splits them into the link (if any) and the words around it.
 */
export function splitSource(source: string | null | undefined): { url: string | null; text: string } {
  if (!source) return { url: null, text: '' };
  const m = source.match(/https?:\/\/[^\s)]+/);
  if (!m) return { url: null, text: source.trim() };
  const url = m[0].replace(/[.,;:]+$/, '');
  let text = source.replace(m[0], ' ').replace(/\s+/g, ' ').trim();
  // "(p.27: ...)" left on its own reads better without the parentheses.
  if (/^\(.*\)$/.test(text)) text = text.slice(1, -1);
  text = text.replace(/[\s.]*$/, '').trim();
  return { url, text };
}
