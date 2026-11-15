import type { ReactNode } from 'react';

/** Every page opens with its title and a one-line instruction in plain words. */
export function PageIntro({ title, intro, aside }: { title: string; intro: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-8 pt-10 sm:flex-row sm:items-end sm:justify-between md:pt-14">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold md:text-5xl">{title}</h1>
        <p className="mt-3 text-lg text-text-muted">{intro}</p>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
