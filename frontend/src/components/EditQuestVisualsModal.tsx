import React, { useState } from 'react';
import { Quest } from '../types';
import { questServiceSupabase } from '../services/questServiceSupabase';
import { storageService } from '../services/storageService';
import { showToast } from './Toast';

interface EditQuestVisualsModalProps {
    quest: Quest;
    onClose: () => void;
    onUpdate: (updatedQuest: Quest) => void;
}

export function EditQuestVisualsModal({ quest, onClose, onUpdate }: EditQuestVisualsModalProps) {
    const [formData, setFormData] = useState({
        title: quest.title,
        description: quest.description,
        logo: quest.logo || '',
        cover: quest.cover || '',
        image: quest.image || '', // Keep for backward compatibility/reference
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<{ logo: boolean; cover: boolean }>({ logo: false, cover: false });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(prev => ({ ...prev, [type]: true }));
        try {
            // Use quest ID as folder path to organize images
            const path = `quest-${quest.id}`;
            const url = await storageService.uploadImage(file, 'quest-images', path);

            if (url) {
                setFormData(prev => ({ ...prev, [type]: url }));
                showToast(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully`, 'success');
            } else {
                showToast(`Failed to upload ${type}`, 'error');
            }
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            showToast(`Error uploading ${type}`, 'error');
        } finally {
            setIsUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Create update object with only changed fields
            const updates: Partial<Quest> = {};
            if (formData.title !== quest.title) updates.title = formData.title;
            if (formData.description !== quest.description) updates.description = formData.description;
            if (formData.logo !== quest.logo) updates.logo = formData.logo || undefined;
            if (formData.cover !== quest.cover) updates.cover = formData.cover || undefined;

            if (Object.keys(updates).length === 0) {
                onClose();
                return;
            }

            console.log('Saving quest updates:', updates);
            const updated = await questServiceSupabase.updateQuest(quest.id, updates);

            if (updated) {
                showToast('Quest updated successfully', 'success');
                onUpdate(updated);
                onClose();
            } else {
                showToast('Failed to update quest', 'error');
            }
        } catch (error) {
            console.error('Error updating quest:', error);
            showToast('Error updating quest', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="social-popup-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                className="social-popup-container"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div
                    className="social-popup-header"
                    style={{
                        padding: '20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}
                >
                    <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 600 }}>Edit Quest Visuals</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div
                    className="social-popup-content"
                    style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        overflowY: 'auto',
                        flexGrow: 1
                    }}
                >
                    {/* Title Field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 500 }}>Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Description Field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 500 }}>Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                                minHeight: '60px'
                            }}
                        />
                    </div>

                    {/* Logo Upload */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 500 }}>Logo (Small Square)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                {formData.logo ? (
                                    <img src={formData.logo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>None</span>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <label
                                    style={{
                                        display: 'inline-block',
                                        padding: '8px 16px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: isUploading.logo ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        textAlign: 'center'
                                    }}
                                >
                                    {isUploading.logo ? 'Uploading...' : 'Upload Logo'}
                                    <input
                                        type="file"
                                        accept="image/*,.svg"
                                        onChange={(e) => handleFileUpload(e, 'logo')}
                                        disabled={isUploading.logo}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Cover Image Upload */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 500 }}>Cover Image (Background)</label>
                        <div style={{
                            width: '100%',
                            height: '120px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            position: 'relative',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            {formData.cover ? (
                                <img src={formData.cover} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                    No Cover Image
                                </div>
                            )}
                            <div style={{
                                position: 'absolute',
                                bottom: '10px',
                                right: '10px'
                            }}>
                                <label
                                    style={{
                                        display: 'inline-block',
                                        padding: '6px 12px',
                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                        backdropFilter: 'blur(4px)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        borderRadius: '6px',
                                        color: 'white',
                                        cursor: isUploading.cover ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 500
                                    }}
                                >
                                    {isUploading.cover ? 'Uploading...' : 'Change Cover'}
                                    <input
                                        type="file"
                                        accept="image/*,.svg"
                                        onChange={(e) => handleFileUpload(e, 'cover')}
                                        disabled={isUploading.cover}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                            This will also set the 'image' field for backward compatibility.
                        </p>
                    </div>
                </div>

                <div
                    className="social-popup-actions"
                    style={{
                        padding: '20px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        flexShrink: 0
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 600
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isUploading.logo || isUploading.cover}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: isSaving || isUploading.logo || isUploading.cover ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {isSaving ? (
                            <>
                                <div className="claim-spinner" style={{ width: '16px', height: '16px' }}></div>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
