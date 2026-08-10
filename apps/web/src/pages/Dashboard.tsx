import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listSites } from "../api/client";

export default function Dashboard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: listSites
  });

  if (isLoading) return <p className="text-sm text-zinc-600">Loading sites...</p>;
  if (error) return <p className="text-sm font-medium text-rose-700">{error.message}</p>;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="text-sm text-zinc-600">Sites, recent scans, and priority trends.</p>
        </div>
        <Link
          to="/scan/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Scan
        </Link>
      </div>

      {!data?.length ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">No sites scanned yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Site</th>
                <th className="px-4 py-3 font-semibold">Latest Status</th>
                <th className="px-4 py-3 font-semibold">Violations</th>
                <th className="px-4 py-3 font-semibold">Avg Priority</th>
                <th className="px-4 py-3 font-semibold">Trend</th>
                <th className="px-4 py-3 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {data.map((site) => {
                const latest = site.recentScans[0];
                const chartData = [...site.recentScans].reverse().map((scan, index) => ({
                  name: `S${index + 1}`,
                  score: scan.averagePriorityScore
                }));

                return (
                  <tr key={site.id} className="align-middle">
                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-950">{site.name ?? site.url}</div>
                      <div className="break-all text-xs text-zinc-500">{site.url}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                        {latest?.status ?? "NONE"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold">{latest?.totalViolations ?? 0}</td>
                    <td className="px-4 py-4 font-semibold">{latest?.averagePriorityScore ?? 0}</td>
                    <td className="h-20 w-44 px-4 py-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="name" hide />
                          <YAxis domain={[0, 100]} hide />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="#0f766e" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </td>
                    <td className="px-4 py-4">
                      {latest ? (
                        <Link
                          to={`/scans/${latest.id}`}
                          title="Open scan"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
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
      )}
    </section>
  );
}
