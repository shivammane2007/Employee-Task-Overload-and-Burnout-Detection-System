'use client';

import { useState, useEffect } from 'react';
import { configAPI } from '@/lib/api';

export default function AdminSettingsPage() {
    const [configs, setConfigs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // state to hold edited values
    const [editedValues, setEditedValues] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [configsRes, categoriesRes] = await Promise.all([
                configAPI.getAll(),
                configAPI.getCategories()
            ]);

            if (configsRes.success) {
                setConfigs(configsRes.data);
                const initialValues = {};
                configsRes.data.forEach(c => {
                    initialValues[c.key] = c.parsedValue;
                });
                setEditedValues(initialValues);
            }
            if (categoriesRes.success) {
                setCategories(categoriesRes.data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (key, value, type) => {
        let parsed = value;
        if (type === 'number') parsed = value === '' ? '' : Number(value);
        if (type === 'boolean') parsed = Boolean(value);

        setEditedValues(prev => ({ ...prev, [key]: parsed }));
    };

    const handleSave = async (key) => {
        try {
            setSaving(true);
            setMessage({ type: '', text: '' });
            
            const newValue = editedValues[key];
            const response = await configAPI.update(key, newValue);
            
            if (response.success) {
                setMessage({ type: 'success', text: `Setting '${key}' updated successfully.` });
                fetchData(); // Refresh to get updated_by_name, updated_at etc.
            } else {
                setMessage({ type: 'error', text: response.message || 'Failed to update setting.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'An error occurred.' });
        } finally {
            setSaving(false);
            // Auto clear success message after 3 seconds
            setTimeout(() => {
                setMessage(prev => prev.type === 'success' ? { type: '', text: '' } : prev);
            }, 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">System Settings</h1>
                <p className="page-subtitle">Configure application algorithms and thresholds</p>
            </div>

            {message.text && (
                <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} mb-lg`}>
                    {message.text}
                </div>
            )}

            {categories.map(category => {
                const categoryConfigs = configs.filter(c => c.category === category);
                if (categoryConfigs.length === 0) return null;

                return (
                    <div key={category} className="card mb-lg">
                        <div className="card-header">
                            <h3 className="card-title" style={{ textTransform: 'capitalize' }}>
                                {category.replace(/_/g, ' ')}
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="grid gap-lg">
                                {categoryConfigs.map(config => (
                                    <div key={config.key} className="flex gap-md" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label font-medium mb-xs">
                                                {config.key}
                                            </label>
                                            <p className="text-sm text-muted mb-sm">{config.description}</p>
                                            
                                            {config.value_type === 'boolean' ? (
                                                <select 
                                                    className="form-select"
                                                    value={editedValues[config.key]?.toString() || 'false'}
                                                    onChange={(e) => handleValueChange(config.key, e.target.value === 'true', 'boolean')}
                                                    disabled={!config.is_editable}
                                                    style={{ maxWidth: '300px' }}
                                                >
                                                    <option value="true">Enabled</option>
                                                    <option value="false">Disabled</option>
                                                </select>
                                            ) : config.value_type === 'number' ? (
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={editedValues[config.key] !== undefined ? editedValues[config.key] : ''}
                                                    onChange={(e) => handleValueChange(config.key, e.target.value, 'number')}
                                                    disabled={!config.is_editable}
                                                    style={{ maxWidth: '300px' }}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedValues[config.key] || ''}
                                                    onChange={(e) => handleValueChange(config.key, e.target.value, 'string')}
                                                    disabled={!config.is_editable}
                                                    style={{ maxWidth: '300px' }}
                                                />
                                            )}
                                            
                                            <div className="text-xs text-muted mt-xs">
                                                Last updated: {new Date(config.updated_at).toLocaleString()} 
                                                {config.updated_by_name ? ` by ${config.updated_by_name}` : ''}
                                            </div>
                                        </div>
                                        
                                        <div style={{ paddingTop: '28px' }}>
                                            <button 
                                                className="btn btn-primary"
                                                onClick={() => handleSave(config.key)}
                                                disabled={!config.is_editable || saving || editedValues[config.key] === config.parsedValue}
                                            >
                                                {saving ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
