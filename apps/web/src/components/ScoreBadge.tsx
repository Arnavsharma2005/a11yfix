interface ScoreBadgeProps {
  score: number;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const tone =
    score >= 80
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : score >= 55
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <span className={`inline-flex min-w-14 items-center justify-center rounded-lg border px-2 py-1 text-sm font-semibold ${tone}`}>
      {score}
    </span>
  );
}
