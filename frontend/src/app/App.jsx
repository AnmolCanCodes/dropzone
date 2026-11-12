import { useEffect, useState } from 'react';

export function App() {
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/v1/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('API request failed');
        return response.json();
      })
      .then((data) => setApiStatus(data.status === 'ok' ? 'connected' : 'unavailable'))
      .catch((error) => {
        if (error.name !== 'AbortError') setApiStatus('unavailable');
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <div className="topline">
        <span className="brand-mark">DZ</span>
        <span className="wordmark">DROPZONE</span>
        <span className="build-label">DEVELOPMENT BUILD / 0.1.0</span>
      </div>

      <section className="hero">
        <p className="eyebrow">BROWSER-BASED BATTLE ROYALE PROJECT</p>
        <h1>THE ISLAND<br /><em>IS WAITING.</em></h1>
        <p className="intro">
          A multiplayer battle royale built brick by brick. This is the project
          foundation: the client is alive, and the API connection is being checked.
        </p>
        <div className="status-panel">
          <span className={`status-dot ${apiStatus}`} />
          <span>BACKEND STATUS</span>
          <strong>{apiStatus.toUpperCase()}</strong>
        </div>
      </section>

      <footer>
        <span>PHASE 00 / FOUNDATION</span>
        <span>NO MATCHES AVAILABLE YET</span>
      </footer>
    </main>
  );
}
