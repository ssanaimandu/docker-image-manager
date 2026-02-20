import { useState, useEffect } from 'react';
import { getSources, getAllImages, getPolicies } from '../api/client';

export default function Dashboard() {
    const [stats, setStats] = useState({ sources: 0, images: 0, tags: 0, policies: 0 });
    const [sources, setSources] = useState([]);
    const [recentImages, setRecentImages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [srcData, imgData, polData] = await Promise.all([
                    getSources(),
                    getAllImages(),
                    getPolicies(),
                ]);
                setSources(srcData || []);
                const imgs = (imgData || []).filter(i => !i.error);
                setRecentImages(imgs.slice(0, 8));
                const totalTags = imgs.reduce((sum, i) => sum + (i.tag_count || 0), 0);
                const policyCount = Object.keys(polData?.image_policies || {}).length;
                setStats({
                    sources: (srcData || []).length,
                    images: imgs.length,
                    tags: totalTags,
                    policies: policyCount,
                });
            } catch {
                // ignore
            }
            setLoading(false);
        }
        load();
    }, []);

    const sourceTypeLabel = (type) => {
        const map = { docker_engine: 'Docker Engine', private_registry: 'Private Registry', artifactory: 'Artifactory' };
        return map[type] || type;
    };

    const sourceTypeDotClass = (type) => {
        const map = { docker_engine: 'docker', private_registry: 'registry', artifactory: 'artifactory' };
        return map[type] || '';
    };

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Docker Image Manager overview</p>
                </div>
                <div className="loading-overlay"><div className="spinner"></div> Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Docker Image Manager overview</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.sources}</div>
                    <div className="stat-label">Connected Sources</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.images}</div>
                    <div className="stat-label">Total Images</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.tags}</div>
                    <div className="stat-label">Total Tags</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.policies}</div>
                    <div className="stat-label">Image Policies</div>
                </div>
            </div>

            {/* Sources summary */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h2 className="card-title">Sources</h2>
                </div>
                {sources.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔗</div>
                        <div className="empty-state-title">No sources configured</div>
                        <div className="empty-state-desc">Add a Docker Engine, Registry, or Artifactory source to get started.</div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sources.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                                        <td>
                                            <span className="source-type">
                                                <span className={`source-type-dot ${sourceTypeDotClass(s.type)}`}></span>
                                                {sourceTypeLabel(s.type)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${s.enabled ? 'badge-success' : 'badge-neutral'}`}>
                                                {s.enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent images */}
            {recentImages.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Images</h2>
                        <span className="badge badge-info">{recentImages.length} shown</span>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Source</th>
                                    <th>Tags</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentImages.map((img, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 600 }}>{img.name}</td>
                                        <td>{img.source_name}</td>
                                        <td><span className="badge badge-info">{img.tag_count}</span></td>
                                        <td>
                                            <span className="source-type">
                                                <span className={`source-type-dot ${sourceTypeDotClass(img.source_type)}`}></span>
                                                {sourceTypeLabel(img.source_type)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
