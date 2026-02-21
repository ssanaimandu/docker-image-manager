import { useState } from 'react';
import { previewCleanup, executeCleanup } from '../api/client';
import { useToast } from '../components/Toast';

export default function Cleanup() {
    const toast = useToast();
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState(null);

    const handlePreview = async () => {
        setLoading(true);
        setResult(null);
        try {
            const data = await previewCleanup();
            setPreview(data);
            if (data.length === 0) {
                toast('No tags to clean up', 'info');
            }
        } catch (e) {
            toast(e.message, 'error');
        }
        setLoading(false);
    };

    const handleExecute = async () => {
        if (!confirm('⚠️ This action is IRREVERSIBLE. Are you sure you want to delete these tags?')) return;
        setExecuting(true);
        try {
            const res = await executeCleanup();
            setResult(res);
            setPreview(null);
            toast(`Cleanup complete: ${res.total_deleted} deleted, ${res.total_failed} failed`, res.total_failed > 0 ? 'error' : 'success');
        } catch (e) {
            toast(e.message, 'error');
        }
        setExecuting(false);
    };

    const sourceTypeLabel = (type) => {
        const map = { docker_engine: 'Docker Engine', private_registry: 'Private Registry', artifactory: 'Artifactory' };
        return map[type] || type;
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 MB';
        const mb = bytes / 1024 / 1024;
        if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb.toFixed(1)} MB`;
    };

    const totalFreed = preview ? preview.reduce((acc, p) => acc + (p.freed_bytes || 0), 0) : 0;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Cleanup</h1>
                <p className="page-subtitle">Preview and execute tag cleanup based on retention policies</p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <button className="btn btn-primary" onClick={handlePreview} disabled={loading}>
                    {loading ? '⏳ ' : '🔍 '}Preview Cleanup
                </button>
                {preview && preview.length > 0 && (
                    <button className="btn btn-danger" onClick={handleExecute} disabled={executing}>
                        {executing ? '⏳ ' : '🗑️ '}Execute Cleanup
                    </button>
                )}
            </div>

            {/* Warning */}
            {preview && preview.length > 0 && (
                <div style={{
                    padding: '14px 20px',
                    background: 'rgba(255, 82, 82, 0.08)',
                    border: '1px solid rgba(255, 82, 82, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 24,
                    fontSize: 13,
                    color: 'var(--color-danger)',
                }}>
                    ⚠️ <strong>Warning:</strong> Deleting tags is irreversible. Please review the list below carefully before executing.
                    <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-primary)' }}>
                        <strong>Estimated space to be freed: <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{formatSize(totalFreed)}</span></strong>
                    </div>
                </div>
            )}

            {/* Preview */}
            {preview && preview.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">✅</div>
                        <div className="empty-state-title">All clean!</div>
                        <div className="empty-state-desc">No tags exceed the retention policy. Nothing to delete.</div>
                    </div>
                </div>
            )}

            {preview && preview.length > 0 && (
                <div>
                    {preview.map((item, idx) => (
                        <div key={idx} className="cleanup-group">
                            <div className="cleanup-group-header">
                                <div>
                                    <span style={{ fontFamily: 'monospace' }}>{item.image_name}</span>
                                    <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.source_name} ({sourceTypeLabel(item.source_type)})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>{formatSize(item.freed_bytes)}</span>
                                    <span className="badge badge-danger">{item.tags_to_delete.length} to delete</span>
                                </div>
                            </div>
                            <div className="cleanup-tags">
                                <div style={{ width: '100%', marginBottom: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                        Keeping ({item.tags_to_keep.length})
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {item.tags_to_keep.map(tag => {
                                            const reason = item.reason_kept?.[tag];
                                            let cls = 'keep';
                                            if (reason === 'protected_tag') cls = 'protected';
                                            if (reason === 'running_container') cls = 'running';
                                            return (
                                                <span key={tag} className={`tag-pill ${cls}`}>
                                                    {tag}
                                                    {reason === 'protected_tag' && ' 🔒'}
                                                    {reason === 'running_container' && ' 🟢'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div style={{ width: '100%' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                        Deleting ({item.tags_to_delete.length})
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {item.tags_to_delete.map(tag => (
                                            <span key={tag} className="tag-pill delete">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Execution result */}
            {result && (
                <div className="card" style={{ marginTop: 24 }}>
                    <div className="card-header">
                        <h2 className="card-title">Cleanup Result</h2>
                    </div>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{result.total_deleted}</div>
                            <div className="stat-label">Tags Deleted</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: result.total_failed > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>{result.total_failed}</div>
                            <div className="stat-label">Failed</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{formatSize(result.total_freed_bytes)}</div>
                            <div className="stat-label">Space Freed</div>
                        </div>
                    </div>
                    {result.details && result.details.length > 0 && (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Tag</th>
                                        <th>Status</th>
                                        <th>Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.details.map((d, i) => (
                                        <tr key={i}>
                                            <td style={{ fontFamily: 'monospace' }}>{d.image_name}</td>
                                            <td style={{ fontFamily: 'monospace' }}>{d.tag}</td>
                                            <td>
                                                <span className={`badge ${d.success ? 'badge-success' : 'badge-danger'}`}>
                                                    {d.success ? 'Deleted' : 'Failed'}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>{d.error || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
