import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SiteSummary } from "@a11yfix/shared-types";
import { listSites } from "../api/client";
import EmptyStateCard from "../components/EmptyStateCard";
import ScoreBadge from "../components/ScoreBadge";

const getStatusBadge = (status?: string) => {
  switch (status) {
    case "COMPLETED":
      return "border border-teal-200 bg-teal-50 text-teal-800";
    case "FAILED":
      return "border border-rose-200 bg-rose-50 text-rose-800";
    case "QUEUED":
    case "CRAWLING":
    case "SCANNING":
      return "border border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border border-hairline bg-surface text-slate";
  }
};

export default function Dashboard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: listSites
  });

  if (isLoading) return <p className="text-sm text-slate">Loading sites...</p>;
  if (error) return <p className="text-sm font-medium text-rose-700">{error.message}</p>;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
          <p className="text-sm text-slate">Sites, recent scans, and priority trends.</p>
        </div>
        <Link
          to="/scan/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-signal px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Scan
        </Link>
      </div>

      {!data?.length ? (
        <EmptyStateCard
          icon={<ShieldCheck className="h-6 w-6 text-signal" aria-hidden="true" />}
          title="No sites scanned yet"
          description="Submit a public website URL to run automated WCAG scans, compute priority scores, and generate fixes."
          action={
            <Link
              to="/scan/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-signal px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Start First Scan
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm sm:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-canvas font-mono text-[11px] uppercase tracking-wider text-slate">
                <tr>
                  <th className="px-4 py-3 font-semibold">Site</th>
                  <th className="px-4 py-3 font-semibold">Latest Status</th>
                  <th className="px-4 py-3 font-semibold">Violations</th>
                  <th className="px-4 py-3 font-semibold">Avg Priority</th>
                  <th className="px-4 py-3 font-semibold">Trend</th>
                  <th className="px-4 py-3 font-semibold">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {data.map((site: SiteSummary) => {
                  const latest = site.recentScans[0];
                  const chartData = [...site.recentScans].reverse().map((scan, index) => ({
                    name: `S${index + 1}`,
                    score: scan.averagePriorityScore
                  }));

                  return (
                    <tr key={site.id} className="align-middle transition-colors hover:bg-canvas/60">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-ink">{site.name ?? site.url}</div>
                        <div className="break-all font-mono text-xs text-slate">{site.url}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold ${getStatusBadge(latest?.status)}`}>
                          {latest?.status ?? "NONE"}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono font-semibold text-ink">{latest?.totalViolations ?? 0}</td>
                      <td className="px-4 py-4 font-mono">
                        <ScoreBadge score={latest?.averagePriorityScore ?? 0} />
                      </td>
                      <td className="h-20 w-44 px-4 py-4">
                        {chartData.length >= 2 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <XAxis dataKey="name" hide />
                              <YAxis domain={[0, 100]} hide />
                              <Tooltip />
                              <Line type="monotone" dataKey="score" stroke="#0F766E" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : chartData.length === 1 ? (
                          <div className="flex h-full items-center justify-center">
                            <span className="h-2.5 w-2.5 rounded-full bg-signal" title={`Single scan score: ${chartData[0].score}`} />
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-slate">No scans</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {latest ? (
                          <Link
                            to={`/scans/${latest.id}`}
                            title="Open scan"
                            aria-label={`Open scan details for ${site.name ?? site.url}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-slate transition-colors hover:bg-hairline/50 hover:text-ink"
                          >
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (<640px) */}
          <div className="space-y-3 sm:hidden">
            {data.map((site: SiteSummary) => {
              const latest = site.recentScans[0];
              return (
                <article key={site.id} className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{site.name ?? site.url}</h3>
                      <p className="break-all font-mono text-xs text-slate">{site.url}</p>
                    </div>
                    <span className={`rounded-lg px-2 py-1 font-mono text-xs font-semibold ${getStatusBadge(latest?.status)}`}>
                      {latest?.status ?? "NONE"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3 text-xs">
                    <div>
                      <span className="text-slate">Violations: </span>
                      <span className="font-mono font-semibold text-ink">{latest?.totalViolations ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate">Avg Priority: </span>
                      <ScoreBadge score={latest?.averagePriorityScore ?? 0} />
                    </div>
                    {latest ? (
                      <Link
                        to={`/scans/${latest.id}`}
                        aria-label={`Open scan for ${site.name ?? site.url}`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-ink px-3 text-xs font-medium text-white hover:bg-zinc-800"
                      >
                        Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
