import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { getAuthStatus } from '../api/client';

export default function Layout() {
    const [authLoading, setAuthLoading] = useState(true);
    const [requireAuth, setRequireAuth] = useState(false);
    const location = useLocation();

    useEffect(() => {
        getAuthStatus().then(status => {
            setRequireAuth(status.enabled);
            setAuthLoading(false);
        }).catch(() => {
            setAuthLoading(false);
        });
    }, []);

    if (authLoading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const token = localStorage.getItem('dim_token');

    if (requireAuth && !token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
