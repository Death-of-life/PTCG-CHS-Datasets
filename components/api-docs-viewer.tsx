"use client";

import { useEffect, useState } from "react";

import styles from "./api-docs-viewer.module.css";

type OpenApiDoc = {
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<
    string,
    Record<
      string,
      {
        summary?: string;
        description?: string;
        parameters?: Array<{
          name: string;
          in: string;
          required?: boolean;
          schema?: { type?: string; default?: unknown; enum?: string[]; maximum?: number };
        }>;
        requestBody?: {
          required?: boolean;
        };
        responses?: Record<string, { description?: string }>;
      }
    >
  >;
};

export function ApiDocsViewer() {
  const [doc, setDoc] = useState<OpenApiDoc | null>(null);

  useEffect(() => {
    fetch("/api/openapi.json")
      .then((response) => response.json())
      .then((payload: OpenApiDoc) => setDoc(payload));
  }, []);

  if (!doc) {
    return <main className={styles.page}>Loading API docs...</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>OPENAPI DOCS</p>
        <h1>{doc.info.title}</h1>
        <p>{doc.info.description}</p>
        <div className={styles.meta}>
          <span>Version {doc.info.version}</span>
          <a href="/api/openapi.json">Raw JSON</a>
        </div>
      </header>

      <section className={styles.section}>
        {Object.entries(doc.paths).map(([route, methods]) => (
          <article key={route} className={styles.card}>
            <h2>{route}</h2>
            <div className={styles.methods}>
              {Object.entries(methods).map(([method, details]) => (
                <div key={`${route}-${method}`} className={styles.methodBlock}>
                  <div className={styles.methodHeader}>
                    <span className={styles.method}>{method.toUpperCase()}</span>
                    <strong>{details.summary ?? "Untitled endpoint"}</strong>
                  </div>
                  {details.description ? <p>{details.description}</p> : null}

                  {details.parameters?.length ? (
                    <div>
                      <h3>Parameters</h3>
                      <ul className={styles.list}>
                        {details.parameters.map((param) => (
                          <li key={`${method}-${param.name}`}>
                            <code>{param.name}</code> · {param.in}
                            {param.required ? " · required" : ""}
                            {param.schema?.type ? ` · ${param.schema.type}` : ""}
                            {param.schema?.enum?.length ? ` · ${param.schema.enum.join(" | ")}` : ""}
                            {param.schema?.default !== undefined ? ` · default=${String(param.schema.default)}` : ""}
                            {param.schema?.maximum !== undefined ? ` · max=${String(param.schema.maximum)}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {details.requestBody ? (
                    <div>
                      <h3>Request Body</h3>
                      <p>{details.requestBody.required ? "Required JSON body" : "Optional request body"}</p>
                    </div>
                  ) : null}

                  {details.responses ? (
                    <div>
                      <h3>Responses</h3>
                      <ul className={styles.list}>
                        {Object.entries(details.responses).map(([status, response]) => (
                          <li key={`${method}-${status}`}>
                            <code>{status}</code> · {response.description ?? "No description"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
