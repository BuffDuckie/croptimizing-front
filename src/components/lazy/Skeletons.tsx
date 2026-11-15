/** Placeholder cards with fixed heights, so the page does not jump when charts load. */
export function PanelsSkeleton({ count = 4, height = 'h-[480px]' }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton rounded-card ${height}`} />
      ))}
    </div>
  );
}
