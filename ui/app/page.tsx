"use client";

import { useState, type FormEvent } from "react";

type ChangeAnalysis = {
  riskLevel: "Low" | "Medium" | "High";
  impactedAreas: string[];
  recommendedTesting: string[];
};

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [changeDescription, setChangeDescription] = useState("");
  const [analysis, setAnalysis] = useState<ChangeAnalysis>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: changeDescription })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);
      setAnalysis(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="intro">
        <p className="eyebrow">tiQtoQ Software Developer Interview Challenge</p>
        <h1 id="page-title">Change Risk Analyser</h1>
        <p className="lede">See the testing risk for a proposed change.</p>
      </section>

      <div className="workspace">
        <form className="change-form" onSubmit={handleSubmit}>
          <h2>Describe your change</h2>
          <label htmlFor="change">What do you want to change?</label>
          <textarea
            id="change"
            rows={8}
            placeholder="For example: Allow administrators to reset a user's MFA."
            value={changeDescription}
            onChange={(event) => setChangeDescription(event.target.value)}
          />
          <p className="field-hint">Include the feature, affected users and any important rules.</p>
          <button className="secondary-button" disabled={!changeDescription.trim() || loading}>
            {loading ? "Analysing..." : "Analyse change"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>

        <section className="results" aria-live="polite">
          <div className="results-heading">
            <h2>Assessment</h2>
            <p className="field-hint">
              {analysis ? "Based on the proposed change." : "Your analysis will appear here."}
            </p>
          </div>
          {analysis && (
            <div className="result-list">
              <div className="result-card">
                <h3>Risk level</h3>
                <strong>{analysis.riskLevel}</strong>
              </div>
              <div className="result-card">
                <h3>Affected areas</h3>
                <p>{analysis.impactedAreas.join(", ")}</p>
              </div>
              <div className="result-card">
                <h3>Recommended testing</h3>
                <ul>
                  {analysis.recommendedTesting.map((test) => (
                    <li key={test}>{test}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
