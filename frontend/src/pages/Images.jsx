import { useState, useEffect } from 'react';
import { getAllImages, getSources } from '../api/client';

export default function Images() {
    const [images, setImages] = useState([]);
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [imgs, srcs] = await Promise.all([getAllImages(), getSources()]);
                setImages((imgs || []).filter(i => !i.error));
                setSources(srcs || []);
            } catch { /* */ }
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

    const formatSize = (bytes) => {
        if (!bytes) return '-';
        const mb = bytes / 1024 / 1024;
        if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb.toFixed(1)} MB`;
    };

    const filtered = images.filter(img => {
        if (filter !== 'all' && img.source_type !== filter) return false;
        if (search && !img.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Images</h1>
                <p className="page-subtitle">Browse Docker images across all connected sources</p>
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <input
                    className="form-input"
                    style={{ maxWidth: 320 }}
                    placeholder="🔍 Search images..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select className="form-select" style={{ maxWidth: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">All Sources</option>
                    <option value="docker_engine">Docker Engine</option>
                    <option value="private_registry">Private Registry</option>
                    <option value="artifactory">Artifactory</option>
                </select>
            </div>

            {loading ? (
                <div className="loading-overlay"><div className="spinner"></div> Loading images...</div>
            ) : filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🐳</div>
                        <div className="empty-state-title">No images found</div>
                        <div className="empty-state-desc">
                            {images.length === 0
                                ? 'Connect a source and make sure it has images.'
                                : 'No images match your current filter.'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Image</th>
                                    <th>Source</th>
                                    <th>Type</th>
                                    <th>Tags</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((img, idx) => (
                                    <>
                                        <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === idx ? null : idx)}>
                                            <td style={{ width: 30 }}>{expanded === idx ? '▼' : '▶'}</td>
                                            <td style={{ fontWeight: 600 }}>{img.name}</td>
                                            <td>{img.source_name}</td>
                                            <td>
                                                <span className="source-type">
                                                    <span className={`source-type-dot ${sourceTypeDotClass(img.source_type)}`}></span>
                                                    {sourceTypeLabel(img.source_type)}
                                                </span>
                                            </td>
                                            <td><span className="badge badge-info">{img.tag_count}</span></td>
                                        </tr>
                                        {expanded === idx && (
                                            <tr key={`${idx}-tags`}>
                                                <td colSpan={5} style={{ padding: 0 }}>
                                                    <div style={{ background: 'var(--bg-elevated)', padding: '16px 24px' }}>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Tag</th>
                                                                    <th>Size</th>
                                                                    <th>Created</th>
                                                                    <th>Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(img.tags || []).map((t, ti) => (
                                                                    <tr key={ti}>
                                                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.tag}</td>
                                                                        <td>{formatSize(t.size)}</td>
                                                                        <td style={{ color: 'var(--text-secondary)' }}>{t.created ? new Date(t.created).toLocaleString() : '-'}</td>
                                                                        <td>
                                                                            {t.is_running && <span className="badge badge-info" style={{ marginRight: 4 }}>Running</span>}
                                                                            {t.is_protected && <span className="badge badge-warning">Protected</span>}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
