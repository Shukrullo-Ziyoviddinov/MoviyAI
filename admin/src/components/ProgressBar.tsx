export function ProgressBar({ value }: { value: number }) {
  const width = Math.min(100, Math.max(0, value));

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[#101624]"
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[#1E4FD6] transition-[width] duration-150"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
