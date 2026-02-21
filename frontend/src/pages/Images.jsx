import { useState, useEffect } from 'react';
import { getAllImages, getSources, deleteImageTag, getImagePolicy, updateImagePolicy, getPolicies } from '../api/client';
import { useToast } from '../components/Toast';

export default function Images() {
    const [images, setImages] = useState([]);
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [selectedTags, setSelectedTags] = useState([]);

    const toast = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const [imgs, srcs, pols] = await Promise.all([getAllImages(), getSources(), getPolicies()]);
            const imagePolicies = pols?.image_policies || {};
            setImages((imgs || []).filter(i => !i.error).map(img => ({
                ...img,
                is_protected: imagePolicies[img.name]?.exclude_from_cleanup || false
            })));
            setSources(srcs || []);
        } catch { /* */ }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const handleDeleteTag = async (sourceId, imageName, tagParam, force = false) => {
        if (!confirm(`Are you sure you want to delete ${imageName}:${tagParam}?`)) return;
        try {
            await deleteImageTag(sourceId, imageName, tagParam, force);
            toast(`Successfully deleted ${imageName}:${tagParam}`, 'success');
            load();
        } catch (err) {
            toast(`Delete failed: ${err.message}`, 'error');
        }
    };

    const handleBatchDelete = async () => {
        if (selectedTags.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedTags.length} selected tags?`)) return;

        let successCount = 0;
        let failCount = 0;

        setLoading(true);
        for (const sel of selectedTags) {
            try {
                await deleteImageTag(sel.sourceId, sel.imageName, sel.tag, false);
                successCount++;
            } catch (err) {
                failCount++;
            }
        }

        if (failCount > 0) {
            toast(`Batch delete finished: ${successCount} deleted, ${failCount} failed`, 'warning');
        } else {
            toast(`Successfully deleted ${successCount} tags`, 'success');
        }

        setSelectedTags([]);
        load();
    };

    const toggleProtect = async (imageName, tagParam, isCurrentlyProtected) => {
        try {
            const policy = await getImagePolicy(imageName);
            let newProtected = policy.protected_tags || [];

            if (isCurrentlyProtected) {
                newProtected = newProtected.filter(t => t !== tagParam);
            } else {
                newProtected = Array.from(new Set([...newProtected, tagParam]));
            }

            await updateImagePolicy(imageName, { protected_tags: newProtected });
            toast(`Tag ${imageName}:${tagParam} is now ${isCurrentlyProtected ? 'unprotected' : 'protected'}`, 'success');
            load();
        } catch (err) {
            toast(`Failed to update protection: ${err.message}`, 'error');
        }
    };

    const toggleImageProtect = async (imageName, isCurrentlyProtected, e) => {
        if (e) e.stopPropagation();
        try {
            await updateImagePolicy(imageName, { exclude_from_cleanup: !isCurrentlyProtected });
            toast(`Image ${imageName} is now ${isCurrentlyProtected ? 'unprotected' : 'protected'}`, 'success');
            load();
        } catch (err) {
            toast(`Failed to update image protection: ${err.message}`, 'error');
        }
    };

    const toggleSelection = (sourceId, imageName, tag, checked) => {
        if (checked) {
            setSelectedTags(prev => [...prev, { sourceId, imageName, tag }]);
        } else {
            setSelectedTags(prev => prev.filter(s => !(s.sourceId === sourceId && s.imageName === imageName && s.tag === tag)));
        }
    };

    const toggleAllTags = (img, checked) => {
        const availableTags = (img.tags || []).filter(t => !t.is_running);
        if (checked) {
            const newSelections = availableTags.map(t => ({ sourceId: img.source_id, imageName: img.name, tag: t.tag }));
            // Add what we don't have
            setSelectedTags(prev => {
                const combined = [...prev];
                newSelections.forEach(ns => {
                    if (!combined.some(c => c.sourceId === ns.sourceId && c.imageName === ns.imageName && c.tag === ns.tag)) {
                        combined.push(ns);
                    }
                });
                return combined;
            });
        } else {
            setSelectedTags(prev => prev.filter(s => s.imageName !== img.name || s.sourceId !== img.source_id));
        }
    };

    const isSelected = (sourceId, imageName, tag) => {
        return selectedTags.some(s => s.sourceId === sourceId && s.imageName === imageName && s.tag === tag);
    };

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
                {selectedTags.length > 0 && (
                    <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={handleBatchDelete}>
                        🗑️ Delete Selected ({selectedTags.length})
                    </button>
                )}
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
                                    <th>Status</th>
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
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {img.is_protected && <span className="badge badge-warning">Protected</span>}
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-elevated)', color: img.is_protected ? 'var(--text-secondary)' : '#ffb84d', border: '1px solid rgba(255, 184, 77, 0.3)' }}
                                                        onClick={(e) => toggleImageProtect(img.name, img.is_protected, e)}
                                                    >
                                                        {img.is_protected ? '🔓 Unprotect' : '🔒 Protect'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expanded === idx && (
                                            <tr key={`${idx}-tags`}>
                                                <td colSpan={6} style={{ padding: 0 }}>
                                                    <div style={{ background: 'var(--bg-elevated)', padding: '16px 24px' }}>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ width: 40 }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            onChange={e => toggleAllTags(img, e.target.checked)}
                                                                            checked={(img.tags || []).filter(t => !t.is_running).length > 0 && (img.tags || []).filter(t => !t.is_running).every(t => isSelected(img.source_id, img.name, t.tag))}
                                                                        />
                                                                    </th>
                                                                    <th>Tag</th>
                                                                    <th>Size</th>
                                                                    <th>Created</th>
                                                                    <th>Status</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(img.tags || []).map((t, ti) => (
                                                                    <tr key={ti} style={{ background: isSelected(img.source_id, img.name, t.tag) ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent' }}>
                                                                        <td>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected(img.source_id, img.name, t.tag)}
                                                                                onChange={e => toggleSelection(img.source_id, img.name, t.tag, e.target.checked)}
                                                                                disabled={t.is_running}
                                                                            />
                                                                        </td>
                                                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.tag}</td>
                                                                        <td>{formatSize(t.size)}</td>
                                                                        <td style={{ color: 'var(--text-secondary)' }}>{t.created ? new Date(t.created).toLocaleString() : '-'}</td>
                                                                        <td>
                                                                            {t.is_running && <span className="badge badge-info" style={{ marginRight: 4 }}>Running</span>}
                                                                            {t.is_protected && <span className="badge badge-warning">Protected</span>}
                                                                        </td>
                                                                        <td style={{ display: 'flex', gap: 6 }}>
                                                                            <button
                                                                                className="btn btn-secondary"
                                                                                style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-elevated)', color: t.is_protected ? 'var(--text-secondary)' : '#ffb84d', border: '1px solid rgba(255, 184, 77, 0.3)' }}
                                                                                onClick={() => toggleProtect(img.name, t.tag, t.is_protected)}
                                                                            >
                                                                                {t.is_protected ? '🔓 Unprotect' : '🔒 Protect'}
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-secondary"
                                                                                style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-elevated)', color: '#ff4c4c', border: '1px solid rgba(255, 76, 76, 0.3)' }}
                                                                                onClick={() => handleDeleteTag(img.source_id, img.name, t.tag, false)}
                                                                                disabled={t.is_running}
                                                                            >
                                                                                Delete
                                                                            </button>
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
