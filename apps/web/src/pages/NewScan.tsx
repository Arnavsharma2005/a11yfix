import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Play, ShieldCheck } from "lucide-react";
import { createScan, createSite } from "../api/client";

export default function NewScan() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const site = await createSite({
        url,
        name: name.trim() || undefined
      });
      return createScan(site.id);
    },
    onSuccess: (scan) => {
      navigate(`/scans/${scan.id}`);
    }
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <section className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-signal">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">New Scan</h1>
          <p className="text-sm text-slate">Submit a public website URL.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-hairline bg-surface p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Website URL</span>
          <input
            required
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.org"
            className="h-11 w-full rounded-lg border border-hairline px-3 text-sm text-ink outline-none ring-signal focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Site name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example Org"
            className="h-11 w-full rounded-lg border border-hairline px-3 text-sm text-ink outline-none ring-signal focus:ring-2"
          />
        </label>

        {mutation.error ? <p className="text-sm font-medium text-rose-700">{mutation.error.message}</p> : null}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-signal px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {mutation.isPending ? "Starting" : "Start Scan"}
        </button>
      </form>
    </section>
  );
}
