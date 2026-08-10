import React from "react";

interface EmptyStateCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyStateCard({ icon, title, description, action }: EmptyStateCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-surface p-8 text-center shadow-sm">
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-canvas text-slate">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm font-sans text-sm text-slate">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
