export function SectionHeader({ label, dotColor }: { label: string; dotColor: string }) {
  return (
    <div className="flex items-center gap-sm mt-sm mb-xs px-md first:mt-0">
      <div className="h-px flex-1 bg-border-default" />
      <span className="flex items-center gap-xs font-sora text-[10px] font-semibold text-on-surface-muted uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        {label}
      </span>
      <div className="h-px flex-1 bg-border-default" />
    </div>
  );
}
