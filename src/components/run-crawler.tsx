"use client";

import { useState } from "react";

interface RunResult {
  crawlRunId?: number;
  status?: string;
  discoveredCount?: number;
  crawledCount?: number;
  extractedCount?: number;
  verifiedCount?: number;
  newScholarshipCount?: number;
  updatedScholarshipCount?: number;
  failedCount?: number;
  error?: string;
}

export function RunCrawler({
  configured,
  configurationMessage,
}: {
  configured: boolean;
  configurationMessage: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  async function startRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/crawler/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const payload = (await response.json()) as RunResult;
      if (!response.ok) throw new Error(payload.error ?? `Crawler request failed (${response.status}).`);
      setResult(payload);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Crawler request failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="run-panel">
      <div className="run-panel-icon">↻</div>
      <div className="run-panel-copy">
        <h3>Run a verification pass</h3>
        <p>Discover official pages, extract supported facts, and record evidence. Runs are bounded by your crawler settings.</p>
      </div>
      {configured ? (
        <form className="run-form" onSubmit={startRun}>
          <button className="button button-primary" disabled={busy} type="submit">
            {busy ? <><span className="spinner" /> Running…</> : "Start crawler"}
          </button>
        </form>
      ) : (
        <span className="config-chip">{configurationMessage}</span>
      )}
      {result && (
        <div
          className={`run-result ${result.error || result.status === "FAILED" || (result.failedCount ?? 0) > 0 ? "run-error" : "run-success"}`}
          role="status"
        >
          {result.error ? result.error : (
            <>
              Run #{result.crawlRunId} {result.status?.toLowerCase()}: {result.discoveredCount} discovered,{" "}
              {result.crawledCount} crawled, {result.extractedCount} extracted,{" "}
              {(result.newScholarshipCount ?? 0) + (result.updatedScholarshipCount ?? 0)} saved,{" "}
              {result.verifiedCount} verified,
              {" "}{result.failedCount} failed.
            </>
          )}
        </div>
      )}
    </div>
  );
}
