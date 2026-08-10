interface ScoreBadgeProps {
  score: number;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const tone =
    score >= 80
      ? "border-l-rose-600 bg-rose-50/60 text-rose-900"
      : score >= 55
        ? "border-l-amber-500 bg-amber-50/60 text-amber-900"
        : "border-l-sky-500 bg-sky-50/60 text-sky-900";

  return (
    <span
      className={`inline-flex items-center rounded-md border-l-4 border-y border-r border-hairline px-2.5 py-0.5 font-mono text-base font-semibold tabular-nums ${tone}`}
      title={`Priority Score: ${score}`}
    >
      {score}
    </span>
  );
}
