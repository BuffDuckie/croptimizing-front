import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { useTranslation } from 'react-i18next';
import { F } from '../../pages/formulas';

const KEYS = ['objective', 'profit', 'water', 'soil', 'cvar', 'shadow', 'et'] as const;

/** KaTeX formulas, loaded after the rest of the page. */
export default function MathFormulas() {
  const { t } = useTranslation();
  return (
    <div className="mt-5 grid gap-3">
      {KEYS.map((k) => {
        const label = t(`method.f.${k}`);
        return (
          <figure key={k} className="m-0 min-w-0 rounded-ctl bg-bg px-4 py-3 ring-1 ring-inset ring-border-soft">
            <div className="overflow-x-auto text-text" tabIndex={0} role="region" aria-label={label}>
              <BlockMath math={F[k]} />
            </div>
            <figcaption className="text-sm text-text-muted">{label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
