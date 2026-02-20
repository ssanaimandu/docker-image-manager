import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { login, oauthLogin, getAuthStatus } from '../api/client';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    useEffect(() => {
        async function checkStatus() {
            try {
                const authStatus = await getAuthStatus();
                setStatus(authStatus);

                // If auth is disabled, skip login
                if (!authStatus.enabled) {
                    navigate('/');
                    return;
                }

                // Handle OAuth callback
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                if (code) {
                    handleOAuthCallback(state === 'oidc' ? 'oidc' : 'github', code);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                toast(`Failed to load auth settings: ${err.message}`, 'error');
                setLoading(false);
            }
        }
        checkStatus();
    }, [navigate]);

    const handleOAuthCallback = async (provider, code) => {
        try {
            setLoading(true);
            const res = await oauthLogin(provider, code);
            localStorage.setItem('dim_token', res.access_token);
            toast('Successfully logged in!', 'success');
            navigate('/');
        } catch (err) {
            toast(`OAuth Login failed: ${err.message}`, 'error');
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await login(username, password);
            localStorage.setItem('dim_token', res.access_token);
            toast('Successfully logged in!', 'success');
            navigate('/');
        } catch (err) {
            toast(`Login failed: ${err.message}`, 'error');
        } finally {
            if (!localStorage.getItem('dim_token')) {
                setLoading(false);
            }
        }
    };

    const handleGithubClick = () => {
        if (!status?.github_client_id) return;
        const redirectUri = window.location.origin + '/login';
        const githubUrl = `https://github.com/login/oauth/authorize?client_id=${status.github_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
        window.location.href = githubUrl;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: 'var(--accent-gradient)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', fontSize: '32px',
                        boxShadow: 'var(--accent-glow)'
                    }}>
                        🐋
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Docker Image Manager</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sign in to continue</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="form-input"
                            placeholder="admin"
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="form-input"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginTop: '8px' }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {(status?.github_enabled || status?.oidc_enabled) && (
                    <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', gap: '16px' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OR</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                    </div>
                )}

                {status?.github_enabled && (
                    <button
                        onClick={handleGithubClick}
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
                    >
                        <svg height="20" viewBox="0 0 16 16" width="20" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                        </svg>
                        Continue with GitHub
                    </button>
                )}

                {status?.oidc_enabled && (
                    <button
                        onClick={() => {
                            if (!status?.oidc_client_id) return;
                            const redirectUri = window.location.origin + '/login';
                            const oidcUrl = `${status.oidc_authorization_url}?client_id=${status.oidc_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(status.oidc_scope)}&state=oidc`;
                            window.location.href = oidcUrl;
                        }}
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginTop: status?.github_enabled ? '12px' : '0' }}
                    >
                        <span style={{ fontSize: '18px' }}>🔐</span>
                        Continue with {status.oidc_provider_name || 'Authelia / OIDC'}
                    </button>
                )}
            </div>
        </div>
    );
}
