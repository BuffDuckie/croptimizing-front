import { rotationColors, colors } from '../../theme/tokens';

/** Four field parcels seen from above. The cyan one is water. */
export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="11" height="11" rx="2.5" fill={rotationColors.alfalfa} />
      <rect x="15" y="2" width="11" height="11" rx="2.5" fill={colors.accent} />
      <rect x="2" y="15" width="11" height="11" rx="2.5" fill={rotationColors.durum_sorghum} />
      <rect x="15" y="15" width="11" height="11" rx="2.5" fill={rotationColors.alfalfa} opacity="0.65" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[1.1875rem] font-semibold tracking-[-0.015em] text-white">Croptimizing</span>
    </span>
  );
}
