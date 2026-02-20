import { useState, useEffect } from 'react';
import { getPolicies, updateDefaultPolicy, updateImagePolicy, deleteImagePolicy } from '../api/client';
import { useToast } from '../components/Toast';

export default function Policies() {
    const toast = useToast();
    const [defaultKeep, setDefaultKeep] = useState(5);
    const [policies, setPolicies] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [form, setForm] = useState({ keep_tags: '', exclude_from_cleanup: false, protected_tags: '' });

    const load = async () => {
        setLoading(true);
        try {
            const data = await getPolicies();
            setDefaultKeep(data.default_keep_tags);
            setPolicies(data.image_policies || {});
        } catch { /* */ }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleSaveDefault = async () => {
        try {
            await updateDefaultPolicy({ default_keep_tags: defaultKeep });
            toast('Default policy updated', 'success');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    const openEdit = (name = '') => {
        const existing = policies[name] || {};
        setEditName(name);
        setForm({
            keep_tags: existing.keep_tags ?? '',
            exclude_from_cleanup: existing.exclude_from_cleanup || false,
            protected_tags: (existing.protected_tags || []).join(', '),
        });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditName('');
        setForm({ keep_tags: '', exclude_from_cleanup: false, protected_tags: '' });
        setShowModal(true);
    };

    const handleSavePolicy = async () => {
        const name = editName || form.image_name;
        if (!name) { toast('Image name required', 'error'); return; }
        try {
            const protectedList = form.protected_tags
                ? form.protected_tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];
            await updateImagePolicy(name, {
                keep_tags: form.keep_tags !== '' ? Number(form.keep_tags) : null,
                exclude_from_cleanup: form.exclude_from_cleanup,
                protected_tags: protectedList,
            });
            toast('Policy saved', 'success');
            setShowModal(false);
            load();
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    const handleDeletePolicy = async (name) => {
        if (!confirm(`Delete policy for "${name}"?`)) return;
        try {
            await deleteImagePolicy(name);
            toast('Policy deleted', 'success');
            load();
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    const policyEntries = Object.entries(policies);

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Policies</h1>
                    <p className="page-subtitle">Configure tag retention policies per image</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>+ Add Policy</button>
            </div>

            {/* Default policy */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h2 className="card-title">Default Retention Policy</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: '0 0 200px' }}>
                        <label className="form-label">Keep Tags (Default)</label>
                        <input
                            className="form-input"
                            type="number"
                            min={1}
                            value={defaultKeep}
                            onChange={e => setDefaultKeep(Number(e.target.value))}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveDefault}>Save</button>
                </div>
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    Images without a specific policy will keep this many tags (newest first).
                </p>
            </div>

            {/* Per-image policies */}
            {loading ? (
                <div className="loading-overlay"><div className="spinner"></div> Loading...</div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Image Policies</h2>
                        <span className="badge badge-info">{policyEntries.length} policies</span>
                    </div>
                    {policyEntries.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">⚙️</div>
                            <div className="empty-state-title">No image-specific policies</div>
                            <div className="empty-state-desc">All images will use the default retention count.</div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Keep Tags</th>
                                        <th>Exclude</th>
                                        <th>Protected Tags</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policyEntries.map(([name, pol]) => (
                                        <tr key={name}>
                                            <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{name}</td>
                                            <td>{pol.keep_tags ?? <span style={{ color: 'var(--text-muted)' }}>default ({defaultKeep})</span>}</td>
                                            <td>
                                                <span className={`badge ${pol.exclude_from_cleanup ? 'badge-warning' : 'badge-neutral'}`}>
                                                    {pol.exclude_from_cleanup ? 'Excluded' : 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                {(pol.protected_tags || []).map(t => (
                                                    <span key={t} className="tag-pill protected" style={{ marginRight: 4 }}>{t}</span>
                                                ))}
                                                {(!pol.protected_tags || pol.protected_tags.length === 0) && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                            </td>
                                            <td style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(name)}>✏️ Edit</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDeletePolicy(name)}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editName ? `Edit Policy: ${editName}` : 'Add Image Policy'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {!editName && (
                                <div className="form-group">
                                    <label className="form-label">Image Name</label>
                                    <input className="form-input" placeholder="e.g. myapp, nginx" onChange={e => setForm(f => ({ ...f, image_name: e.target.value }))} />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Keep Tags (leave empty for default)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={1}
                                    value={form.keep_tags}
                                    onChange={e => setForm(f => ({ ...f, keep_tags: e.target.value }))}
                                    placeholder={`Default: ${defaultKeep}`}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-checkbox">
                                    <input type="checkbox" checked={form.exclude_from_cleanup} onChange={e => setForm(f => ({ ...f, exclude_from_cleanup: e.target.checked }))} />
                                    <span>Exclude from automatic cleanup</span>
                                </label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Protected Tags (comma-separated)</label>
                                <input
                                    className="form-input"
                                    value={form.protected_tags}
                                    onChange={e => setForm(f => ({ ...f, protected_tags: e.target.value }))}
                                    placeholder="latest, stable, production"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSavePolicy}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
