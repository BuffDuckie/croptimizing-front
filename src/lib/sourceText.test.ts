import { splitSource } from './sourceText';

describe('splitSource', () => {
  it('pulls the link out of words around it', () => {
    expect(splitSource('https://a.org/x.pdf (p.27: Pinal AMA districts 2017)')).toEqual({ url: 'https://a.org/x.pdf', text: 'p.27: Pinal AMA districts 2017' });
    expect(splitSource('UA budget: water $70 per acre-foot (the line it leaves out). https://repo.org/123')).toEqual({ url: 'https://repo.org/123', text: 'UA budget: water $70 per acre-foot (the line it leaves out)' });
    expect(splitSource('No link here')).toEqual({ url: null, text: 'No link here' });
  });
});
