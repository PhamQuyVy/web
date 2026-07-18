export function ProgressChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((item) => item.count));

  return (
    <div className="flex h-36 items-end gap-2 rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
      {data.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t bg-orange-600"
            style={{ height: `${Math.max(8, (item.count / max) * 92)}px` }}
            title={`${item.count} hoạt động`}
          />
          <span className="text-xs text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
