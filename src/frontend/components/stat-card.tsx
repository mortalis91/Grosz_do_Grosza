export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
}: Readonly<{
  label: string;
  value: string;
  delta: string;
  tone?: "neutral" | "positive" | "negative";
}>) {
  const toneClasses = {
    neutral: "border-line",
    positive: "border-emerald-400/40 bg-emerald-400/[0.06]",
    negative: "border-rose-400/40 bg-rose-400/[0.06]",
  };
  const deltaClasses = {
    neutral: "text-muted",
    positive: "text-emerald-400",
    negative: "text-rose-400",
  };
  return (
    <article
      className={`rounded-3xl border bg-panel/80 p-6 shadow-glow backdrop-blur ${toneClasses[tone]}`}
    >
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className={`mt-2 text-sm font-medium ${deltaClasses[tone]}`}>
        {delta}
      </div>
    </article>
  );
}
