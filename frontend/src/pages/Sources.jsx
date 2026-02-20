import { useState, useEffect } from 'react';
import { getSources, createSource, updateSource, deleteSource, testSource } from '../api/client';
import { useToast } from '../components/Toast';

const SOURCE_TYPES = [
    { value: 'docker_engine', label: 'Docker Engine' },
    { value: 'private_registry', label: 'Private Registry' },
    { value: 'artifactory', label: 'Artifactory (JFrog)' },
];

const defaultConn = {
    docker_engine: { socket_path: '/var/run/docker.sock', host: '', tls: false },
    private_registry: { url: '', username: '', password: '', insecure: false },
    artifactory: { url: '', repository: 'docker-local', username: '', password: '', api_key: '', use_registry_api: false },
};

export default function Sources() {
    const toast = useToast();
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null); // null = create, obj = edit
    const [form, setForm] = useState({ name: '', type: 'docker_engine', connection: { ...defaultConn.docker_engine }, enabled: true });
    const [testing, setTesting] = useState(null);

    const load = async () => {
        setLoading(true);
        try { setSources(await getSources()); } catch { /* */ }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', type: 'docker_engine', connection: { ...defaultConn.docker_engine }, enabled: true });
        setShowModal(true);
    };

    const openEdit = (src) => {
        setEditing(src);
        setForm({ name: src.name, type: src.type, connection: { ...src.connection }, enabled: src.enabled });
        setShowModal(true);
    };

    const handleTypeChange = (type) => {
        setForm(f => ({ ...f, type, connection: { ...defaultConn[type] } }));
    };

    const handleConnChange = (key, value) => {
        setForm(f => ({ ...f, connection: { ...f.connection, [key]: value } }));
    };

    const handleSave = async () => {
        try {
            if (editing) {
                await updateSource(editing.id, { name: form.name, connection: form.connection, enabled: form.enabled });
                toast('Source updated', 'success');
            } else {
                await createSource(form);
                toast('Source created', 'success');
            }
            setShowModal(false);
            load();
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this source?')) return;
        try {
            await deleteSource(id);
            toast('Source deleted', 'success');
            load();
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    const handleTest = async (id) => {
        setTesting(id);
        try {
            const res = await testSource(id);
            toast(res.message, res.success ? 'success' : 'error');
        } catch (e) {
            toast(e.message, 'error');
        }
        setTesting(null);
    };

    const sourceTypeLabel = (type) => {
        const map = { docker_engine: 'Docker Engine', private_registry: 'Private Registry', artifactory: 'Artifactory' };
        return map[type] || type;
    };

    const sourceTypeDotClass = (type) => {
        const map = { docker_engine: 'docker', private_registry: 'registry', artifactory: 'artifactory' };
        return map[type] || '';
    };

    const renderConnectionFields = () => {
        const t = form.type;
        if (t === 'docker_engine') {
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Socket Path</label>
                        <input className="form-input" value={form.connection.socket_path || ''} onChange={e => handleConnChange('socket_path', e.target.value)} placeholder="/var/run/docker.sock" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Remote Host (optional)</label>
                        <input className="form-input" value={form.connection.host || ''} onChange={e => handleConnChange('host', e.target.value)} placeholder="tcp://192.168.1.100:2375" />
                    </div>
                    <div className="form-group">
                        <label className="form-checkbox">
                            <input type="checkbox" checked={form.connection.tls || false} onChange={e => handleConnChange('tls', e.target.checked)} />
                            <span>Use TLS</span>
                        </label>
                    </div>
                </>
            );
        }
        if (t === 'private_registry') {
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Registry URL</label>
                        <input className="form-input" value={form.connection.url || ''} onChange={e => handleConnChange('url', e.target.value)} placeholder="https://registry.example.com" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input className="form-input" value={form.connection.username || ''} onChange={e => handleConnChange('username', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" value={form.connection.password || ''} onChange={e => handleConnChange('password', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-checkbox">
                            <input type="checkbox" checked={form.connection.insecure || false} onChange={e => handleConnChange('insecure', e.target.checked)} />
                            <span>Allow Insecure (HTTP)</span>
                        </label>
                    </div>
                </>
            );
        }
        if (t === 'artifactory') {
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Artifactory URL</label>
                        <input className="form-input" value={form.connection.url || ''} onChange={e => handleConnChange('url', e.target.value)} placeholder="https://artifactory.example.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Repository</label>
                        <input className="form-input" value={form.connection.repository || ''} onChange={e => handleConnChange('repository', e.target.value)} placeholder="docker-local" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input className="form-input" value={form.connection.username || ''} onChange={e => handleConnChange('username', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" value={form.connection.password || ''} onChange={e => handleConnChange('password', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">API Key (alternative)</label>
                        <input className="form-input" value={form.connection.api_key || ''} onChange={e => handleConnChange('api_key', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-checkbox">
                            <input type="checkbox" checked={form.connection.use_registry_api || false} onChange={e => handleConnChange('use_registry_api', e.target.checked)} />
                            <span>Use Registry API V2 (fallback)</span>
                        </label>
                    </div>
                </>
            );
        }
        return null;
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Sources</h1>
                    <p className="page-subtitle">Manage Docker Engine, Registry, and Artifactory connections</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>+ Add Source</button>
            </div>

            {loading ? (
                <div className="loading-overlay"><div className="spinner"></div> Loading...</div>
            ) : sources.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🔗</div>
                        <div className="empty-state-title">No sources configured</div>
                        <div className="empty-state-desc">Add a source to start managing Docker images.</div>
                        <button className="btn btn-primary" onClick={openCreate}>+ Add Source</button>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
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
                                        <td style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleTest(s.id)} disabled={testing === s.id}>
                                                {testing === s.id ? '⏳' : '🔌'} Test
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>✏️ Edit</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Edit Source' : 'Add Source'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Docker Engine" />
                            </div>
                            {!editing && (
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-select" value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                                        {SOURCE_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {renderConnectionFields()}
                            <div className="form-group">
                                <label className="form-checkbox">
                                    <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
                                    <span>Enabled</span>
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
