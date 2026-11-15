import type { RotationId } from '../../api/types';
import { rotationColors } from '../../theme/tokens';

/** Static class names so Tailwind keeps them. */
export const ROT_BG: Record<RotationId, string> = {
  alfalfa: 'bg-rot-alfalfa',
  cotton_barley: 'bg-rot-cotton_barley',
  durum_sorghum: 'bg-rot-durum_sorghum',
  barley_fallow: 'bg-rot-barley_fallow',
  fallow: 'bg-rot-fallow',
};

export const ROT_HEX: Record<RotationId, string> = rotationColors;

/** Short crop initials for each month (calendar strip), Jan to Dec. Display only. */
export const CROP_INITIALS: Record<RotationId, string[]> = {
  alfalfa: Array(12).fill('A'),
  cotton_barley: ['B', 'B', 'B', 'C', 'C', 'C', 'C', 'C', 'C', 'C', '', 'B'],
  durum_sorghum: ['D', 'D', 'D', 'D', 'D', '', 'S', 'S', 'S', 'S', '', 'D'],
  barley_fallow: ['B', 'B', 'B', 'B', 'B', '', '', '', '', '', '', 'B'],
  fallow: Array(12).fill(''),
};

/** Diagonal hatch for fallow and bare months: color is never the only cue. */
export function HatchDefs({ id = 'hatch', color = 'rgba(255,255,255,0.55)' }: { id?: string; color?: string }) {
  return (
    <defs>
      <pattern id={id} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
        <rect width="2.2" height="7" fill={color} />
      </pattern>
    </defs>
  );
}
