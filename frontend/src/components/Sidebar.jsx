import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuthStatus } from '../api/client';

const navItems = [
    { to: '/', icon: '📊', label: 'Dashboard' },
    { to: '/sources', icon: '🔗', label: 'Sources' },
    { to: '/images', icon: '🐳', label: 'Images' },
    { to: '/policies', icon: '⚙️', label: 'Policies' },
    { to: '/cleanup', icon: '🧹', label: 'Cleanup' },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const [authEnabled, setAuthEnabled] = useState(false);

    useEffect(() => {
        getAuthStatus().then(res => setAuthEnabled(res.enabled)).catch(() => { });
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('dim_token');
        navigate('/login');
    };

    return (
        <aside className="sidebar flex flex-col justify-between" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">🐋</div>
                        <div className="sidebar-logo-text">Docker Image Manager</div>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">Navigation</div>
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
            {authEnabled && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                    <button
                        onClick={handleLogout}
                        className="nav-item"
                        style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}
                    >
                        <span className="nav-item-icon">🚪</span>
                        Logout
                    </button>
                </div>
            )}
        </aside>
    );
}
