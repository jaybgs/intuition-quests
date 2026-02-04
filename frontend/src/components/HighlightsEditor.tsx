import { useState, useEffect, useRef } from 'react';
import { showToast } from './Toast';
import { highlightsServiceSupabase } from '../services/highlightsServiceSupabase';
import type { WeeklyHighlight } from '../types';
import './HighlightsEditor.css';

// Default highlights
const defaultHighlights: WeeklyHighlight[] = [
  {
    id: '1',
    title: 'Project Alpha',
    description: 'Complete tasks to earn rewards and unlock exclusive features. Join thousands of users earning daily!',
    gradientColors: ['#2563eb', '#2563eb'],
    questCount: 12,
    isHot: true,
    questLink: '#quests',
  },
  {
    id: '2',
    title: 'Project Beta',
    description: 'Join the community and participate in exciting challenges. New quests added weekly!',
    gradientColors: ['#10b981', '#3b82f6'],
    questCount: 8,
    isTrending: true,
    questLink: '#quests',
  },
  {
    id: '3',
    title: 'Project Gamma',
    description: 'Explore new opportunities and grow your portfolio. Start your journey today!',
    gradientColors: ['#f59e0b', '#ef4444'],
    questCount: 15,
    questLink: '#quests',
  },
];

// Load highlights from Supabase or use defaults
const loadHighlights = async (): Promise<WeeklyHighlight[]> => {
  try {
    return await highlightsServiceSupabase.getAllHighlights();
  } catch (error) {
    console.warn('Error loading highlights from Supabase:', error);
    return defaultHighlights;
  }
};

// Save highlights to Supabase
const saveHighlights = async (highlightsToSave: WeeklyHighlight[]): Promise<boolean> => {
  try {
    return await highlightsServiceSupabase.saveAllHighlights(highlightsToSave);
  } catch (error) {
    console.error('Error saving highlights to Supabase:', error);
    return false;
  }
};

interface HighlightsEditorProps {
  onBack: () => void;
}

export function HighlightsEditor({ onBack }: HighlightsEditorProps) {
  const [highlights, setHighlights] = useState<WeeklyHighlight[]>([]);
  const [editingHighlight, setEditingHighlight] = useState<WeeklyHighlight | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Separate previews for desktop and mobile images
  const [desktopImagePreview, setDesktopImagePreview] = useState<string | null>(null);
  const [mobileImagePreview, setMobileImagePreview] = useState<string | null>(null);

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  // Load highlights on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedHighlights = await loadHighlights();
        setHighlights(loadedHighlights);
      } catch (error) {
        console.error('Error loading highlights:', error);
        setHighlights(defaultHighlights);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSave = async () => {
    try {
      const success = await saveHighlights(highlights);
      if (success) {
        console.log('Saving weekly highlights:', highlights);
        showToast('Weekly highlights updated successfully!', 'success');

        // Dispatch event to notify other components that highlights were updated
        window.dispatchEvent(new Event('highlightsUpdated'));

        onBack();
      } else {
        showToast('Failed to save highlights. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error saving highlights:', error);
      showToast('Failed to save highlights. Please try again.', 'error');
    }
  };

  const handleAddHighlight = () => {
    const newHighlight: WeeklyHighlight = {
      id: Date.now().toString(),
      title: 'New Highlight',
      description: 'Highlight description goes here...',
      gradientColors: ['#6366f1', '#8b5cf6'],
      questCount: 0,
      questLink: '#quests',
    };
    setHighlights([...highlights, newHighlight]);
  };

  const handleDeleteHighlight = (highlightId: string) => {
    setHighlights(highlights.filter(h => h.id !== highlightId));
    showToast('Highlight deleted', 'info');
  };

  const handleEditHighlight = (highlight: WeeklyHighlight) => {
    setEditingHighlight({ ...highlight });
    setDesktopImagePreview(highlight.desktopImage || highlight.image || null);
    setMobileImagePreview(highlight.mobileImage || null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, type);
    }
  };

  const processFile = (file: File, type: 'desktop' | 'mobile') => {
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      showToast(`${type === 'desktop' ? 'Desktop' : 'Mobile'} logo file size must be less than 2MB`, 'error');
      return;
    }
    const validTypes = ['image/svg+xml', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload an SVG or JPEG/PNG file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'desktop') {
        setDesktopImagePreview(base64String);
        if (editingHighlight) {
          setEditingHighlight(prev => prev ? { ...prev, desktopImage: base64String, image: base64String } : null);
        }
      } else {
        setMobileImagePreview(base64String);
        if (editingHighlight) {
          setEditingHighlight(prev => prev ? { ...prev, mobileImage: base64String } : null);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, type: 'desktop' | 'mobile') => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file, type);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent, type: 'desktop' | 'mobile') => {
    e.stopPropagation();
    if (type === 'desktop') {
      setDesktopImagePreview(null);
      if (editingHighlight) {
        setEditingHighlight(prev => prev ? { ...prev, desktopImage: undefined, image: undefined } : null);
      }
      if (desktopFileInputRef.current) {
        desktopFileInputRef.current.value = '';
      }
    } else {
      setMobileImagePreview(null);
      if (editingHighlight) {
        setEditingHighlight(prev => prev ? { ...prev, mobileImage: undefined } : null);
      }
      if (mobileFileInputRef.current) {
        mobileFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveHighlight = () => {
    if (!editingHighlight) return;

    setHighlights(highlights.map(h =>
      h.id === editingHighlight.id ? editingHighlight : h
    ));
    setEditingHighlight(null);
    showToast('Highlight updated', 'success');
  };

  if (isLoading) {
    return (
      <div className="highlights-editor">
        <div className="highlights-editor-header">
          <button className="highlights-editor-back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <h1 className="highlights-editor-title">Edit Weekly Highlights</h1>
          <div className="highlights-editor-actions">
            <div style={{ padding: '8px 16px', color: 'rgba(255,255,255,0.6)' }}>Loading...</div>
          </div>
        </div>
        <div className="highlights-editor-content">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            color: 'rgba(255,255,255,0.6)'
          }}>
            Loading highlights...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="highlights-editor">
      <div className="highlights-editor-header">
        <button className="highlights-editor-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <h1 className="highlights-editor-title">Edit Weekly Highlights</h1>
        <div className="highlights-editor-actions">
          <button className="highlights-editor-add-btn" onClick={handleAddHighlight}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Highlight
          </button>
          <button className="highlights-editor-save-btn" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>

      <div className="highlights-editor-content">
        <div className="highlights-list">
          {highlights.map((highlight, index) => (
            <div key={highlight.id} className="highlight-card">
              <div className="highlight-header">
                <div className="highlight-number">#{index + 1}</div>
                <div className="highlight-actions">
                  <button
                    className="highlight-edit-btn"
                    onClick={() => handleEditHighlight(highlight)}
                    title="Edit Highlight"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="highlight-delete-btn"
                    onClick={() => handleDeleteHighlight(highlight.id)}
                    title="Delete Highlight"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="highlight-preview">
                <div
                  className="highlight-image"
                  style={{
                    background: `linear-gradient(135deg, ${highlight.gradientColors[0]}, ${highlight.gradientColors[1]})`
                  }}
                >
                  <div className="highlight-image-placeholder" style={{ opacity: (highlight.desktopImage || highlight.image) ? 0 : 1 }}>
                    {highlight.title.charAt(0)}
                  </div>
                  {/* Full cover image or default logo */}
                  {(highlight.desktopImage || highlight.image) ? (
                    <img
                      src={highlight.desktopImage || highlight.image}
                      alt={highlight.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 1,
                        borderRadius: '12px'
                      }}
                    />
                  ) : (
                    <div className="highlight-logo">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  )}
                  <div className="highlight-badges">
                    {highlight.isHot && <span className="badge badge-hot">HOT</span>}
                    {highlight.isTrending && <span className="badge badge-trending">TRENDING</span>}
                  </div>
                </div>
                <div className="highlight-info">
                  <h3 className="highlight-title">{highlight.title}</h3>
                  <p className="highlight-description">{highlight.description}</p>
                  <div className="highlight-stats">
                    <span className="quest-count">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                      {highlight.questCount} quests
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingHighlight && (
        <div className="highlights-editor-modal-overlay" onClick={() => setEditingHighlight(null)}>
          <div className="highlights-editor-modal" onClick={e => e.stopPropagation()}>
            <div className="highlights-editor-modal-header">
              <h2>Edit Highlight</h2>
              <button
                className="highlights-editor-modal-close"
                onClick={() => setEditingHighlight(null)}
              >
                ×
              </button>
            </div>

            <div className="highlights-editor-modal-content">
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={editingHighlight.title}
                  onChange={(e) => setEditingHighlight({ ...editingHighlight, title: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingHighlight.description}
                  onChange={(e) => setEditingHighlight({ ...editingHighlight, description: e.target.value })}
                  rows={3}
                  placeholder="Enter project description"
                />
              </div>

              <div className="form-group">
                <label>Number of Quests</label>
                <input
                  type="number"
                  value={editingHighlight.questCount || 0}
                  onChange={(e) => setEditingHighlight({ ...editingHighlight, questCount: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              {/* Flex container for dual uploads */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Desktop Logo</label>
                  <div
                    className="logo-upload-area"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'desktop')}
                    onClick={() => desktopFileInputRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '120px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {desktopImagePreview ? (
                      <div className="logo-preview-container" style={{ position: 'relative' }}>
                        <img
                          src={desktopImagePreview}
                          alt="Desktop logo preview"
                          style={{
                            maxWidth: '100px',
                            maxHeight: '100px',
                            objectFit: 'contain'
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => handleRemoveImage(e, 'desktop')}
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" style={{ marginBottom: '8px' }}>
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Desktop Logo</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>Max 2MB</span>
                      </>
                    )}
                    <input
                      ref={desktopFileInputRef}
                      type="file"
                      accept=".svg,.jpg,.jpeg,.png"
                      onChange={(e) => handleImageUpload(e, 'desktop')}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Mobile Logo</label>
                  <div
                    className="logo-upload-area"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'mobile')}
                    onClick={() => mobileFileInputRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '120px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {mobileImagePreview ? (
                      <div className="logo-preview-container" style={{ position: 'relative' }}>
                        <img
                          src={mobileImagePreview}
                          alt="Mobile logo preview"
                          style={{
                            maxWidth: '100px',
                            maxHeight: '100px',
                            objectFit: 'contain'
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => handleRemoveImage(e, 'mobile')}
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" style={{ marginBottom: '8px' }}>
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <line x1="12" y1="18" x2="12.01" y2="18" />
                        </svg>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Mobile Logo</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>Max 2MB</span>
                      </>
                    )}
                    <input
                      ref={mobileFileInputRef}
                      type="file"
                      accept=".svg,.jpg,.jpeg,.png"
                      onChange={(e) => handleImageUpload(e, 'mobile')}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>


              <div className="form-group">
                <label>Quest Link</label>
                <input
                  type="text"
                  value={editingHighlight.questLink || ''}
                  onChange={(e) => setEditingHighlight({ ...editingHighlight, questLink: e.target.value || undefined })}
                  placeholder="#quests or https://example.com/quest"
                />
              </div>


              <div className="form-group">
                <label>Background Colors (Hex codes)</label>
                <div className="color-inputs">
                  <input
                    type="text"
                    value={editingHighlight.gradientColors[0]}
                    onChange={(e) => setEditingHighlight({
                      ...editingHighlight,
                      gradientColors: [e.target.value, editingHighlight.gradientColors[1]]
                    })}
                    placeholder="#2563eb"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    value={editingHighlight.gradientColors[1]}
                    onChange={(e) => setEditingHighlight({
                      ...editingHighlight,
                      gradientColors: [editingHighlight.gradientColors[0], e.target.value]
                    })}
                    placeholder="#3b82f6"
                    style={{ flex: 1 }}
                  />
                </div>
                <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                  Enter hex color codes (e.g., #ff0000, #00ff00)
                </small>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingHighlight.isHot || false}
                    onChange={(e) => setEditingHighlight({ ...editingHighlight, isHot: e.target.checked })}
                  />
                  Mark as HOT
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingHighlight.isTrending || false}
                    onChange={(e) => setEditingHighlight({ ...editingHighlight, isTrending: e.target.checked })}
                  />
                  Mark as TRENDING
                </label>
              </div>
            </div>

            <div className="highlights-editor-modal-actions">
              <button className="btn-cancel" onClick={() => setEditingHighlight(null)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveHighlight}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
