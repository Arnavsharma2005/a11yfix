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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">New Scan</h1>
          <p className="text-sm text-zinc-600">Submit a public website URL.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-800">Website URL</span>
          <input
            required
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.org"
            className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-800">Site name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example Org"
            className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
        </label>

        {mutation.error ? <p className="text-sm font-medium text-rose-700">{mutation.error.message}</p> : null}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {mutation.isPending ? "Starting" : "Start Scan"}
        </button>
      </form>
    </section>
  );
}
