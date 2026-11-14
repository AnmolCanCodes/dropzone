import { useEffect, useState } from 'react';
import GameCanvas from '../components/GameCanvas';

const TOKEN_KEY = 'dropzone_token';
const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
};

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function App() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [playing, setPlaying] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/v1/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('API request failed');
        return response.json();
      })
      .then((data) => setApiStatus(data.status === 'ok' ? 'connected' : 'unavailable'))
      .catch((err) => {
        if (err.name !== 'AbortError') setApiStatus('unavailable');
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const controller = new AbortController();

    fetch('/api/v1/auth/me', {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session invalid');
        const payload = await readJson(response);
        setUser(payload?.user ?? null);
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        window.localStorage.removeItem(TOKEN_KEY);
      });

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!token) {
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }

    window.localStorage.setItem(TOKEN_KEY, token);
  }, [token]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = authMode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const payload = authMode === 'login'
        ? {
            email: form.email.trim(),
            password: form.password,
          }
        : {
            username: form.username.trim().toLowerCase(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Authentication failed.');
      }

      setToken(data.token);
      setUser(data.user);
      setForm(EMPTY_FORM);
      setPlaying(true);
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setPlaying(false);
  };

  if (playing) {
    return (
      <div className="game-screen">
        <GameCanvas />
        <button className="exit-button" onClick={() => setPlaying(false)}>
          ← EXIT
        </button>
      </div>
    );
  }

  return (
    <main className="shell auth-shell">
      <div className="topline">
        <span className="brand-mark">DZ</span>
        <span className="wordmark">DROPZONE</span>
        <span className="build-label">DEVELOPMENT BUILD / 0.1.0</span>
      </div>

      <section className="hero auth-hero">
        <p className="eyebrow">ACCOUNT-LOCKED SESSION</p>
        <h1>ENTER THE <em>ARENA</em></h1>
        <p className="intro">
          Sign in to link the match socket to your real DropZone account. The JWT is stored locally and used for every browser connection.
        </p>

        <div className="status-panel">
          <span className={`status-dot ${apiStatus}`} />
          <span>BACKEND STATUS</span>
          <strong>{apiStatus.toUpperCase()}</strong>
        </div>

        <div className="auth-panel">
          {user ? (
            <>
              <div className="account-card">
                <span className="label">SIGNED IN AS</span>
                <strong>{user.username}</strong>
                <span>{user.email}</span>
              </div>

              <div className="auth-actions">
                <button className="play-button" onClick={() => setPlaying(true)}>
                  CONTINUE TO ARENA →
                </button>
                <button className="secondary-button" onClick={handleLogout}>
                  LOG OUT
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-tabs">
                <button
                  type="button"
                  className={authMode === 'login' ? 'tab active' : 'tab'}
                  onClick={() => setAuthMode('login')}
                >
                  LOG IN
                </button>
                <button
                  type="button"
                  className={authMode === 'register' ? 'tab active' : 'tab'}
                  onClick={() => setAuthMode('register')}
                >
                  REGISTER
                </button>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                {authMode === 'register' && (
                  <label>
                    <span>Username</span>
                    <input
                      name="username"
                      value={form.username}
                      onChange={handleInputChange}
                      placeholder="player_name"
                      autoComplete="username"
                    />
                  </label>
                )}

                <label>
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  <span>Password</span>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                </label>

                {error && <p className="error-message">{error}</p>}

                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'WORKING...' : authMode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <footer>
        <span>PHASE 06 / ACCOUNTS & PERSISTENCE</span>
        <span>AUTHENTICATED SOCKETS ENABLED</span>
      </footer>
    </main>
  );
}