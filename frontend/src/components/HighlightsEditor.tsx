import { useState } from 'react';
import { showToast } from './Toast';
import './HighlightsEditor.css';

interface Highlight {
  id: string;
  title: string;
  description: string;
  image?: string;
  gradientColors: string[];
  questCount?: number;
  isHot?: boolean;
  isTrending?: boolean;
}

// Mock highlights data - in a real app, this would come from an API
const initialHighlights: Highlight[] = [
  {
    id: '1',
    title: 'Project Alpha',
    description: 'Complete tasks to earn rewards and unlock exclusive features. Join thousands of users earning daily!',
    gradientColors: ['#2563eb', '#2563eb'],
    questCount: 12,
    isHot: true,
  },
  {
    id: '2',
    title: 'Project Beta',
    description: 'Join the community and participate in exciting challenges. New quests added weekly!',
    gradientColors: ['#10b981', '#3b82f6'],
    questCount: 8,
    isTrending: true,
  },
  {
    id: '3',
    title: 'Project Gamma',
    description: 'Explore new opportunities and grow your portfolio. Start your journey today!',
    gradientColors: ['#f59e0b', '#ef4444'],
    questCount: 15,
  },
];

interface HighlightsEditorProps {
  onBack: () => void;
}

export function HighlightsEditor({ onBack }: HighlightsEditorProps) {
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);

  const handleSave = () => {
    // In a real app, this would save to an API
    console.log('Saving weekly highlights:', highlights);
    showToast('Weekly highlights updated successfully!', 'success');
    onBack();
  };

  const handleAddHighlight = () => {
    const newHighlight: Highlight = {
      id: Date.now().toString(),
      title: 'New Highlight',
      description: 'Highlight description goes here...',
      gradientColors: ['#6366f1', '#8b5cf6'],
      questCount: 0,
    };
    setHighlights([...highlights, newHighlight]);
  };

  const handleDeleteHighlight = (highlightId: string) => {
    setHighlights(highlights.filter(h => h.id !== highlightId));
    showToast('Highlight deleted', 'info');
  };

  const handleEditHighlight = (highlight: Highlight) => {
    setEditingHighlight({ ...highlight });
  };

  const handleSaveHighlight = () => {
    if (!editingHighlight) return;

    setHighlights(highlights.map(h =>
      h.id === editingHighlight.id ? editingHighlight : h
    ));
    setEditingHighlight(null);
    showToast('Highlight updated', 'success');
  };

  return (
      <div className="highlights-editor">
      <div className="highlights-editor-header">
        <button className="highlights-editor-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Back
        </button>
        <h1 className="highlights-editor-title">Edit Weekly Highlights</h1>
        <div className="highlights-editor-actions">
          <button className="highlights-editor-add-btn" onClick={handleAddHighlight}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
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
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className="highlight-delete-btn"
                    onClick={() => handleDeleteHighlight(highlight.id)}
                    title="Delete Highlight"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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
                  {highlight.image && <img src={highlight.image} alt={highlight.title} />}
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
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
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
                  onChange={(e) => setEditingHighlight({...editingHighlight, title: e.target.value})}
                  placeholder="Enter project name"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingHighlight.description}
                  onChange={(e) => setEditingHighlight({...editingHighlight, description: e.target.value})}
                  rows={3}
                  placeholder="Enter project description"
                />
              </div>

              <div className="form-group">
                <label>Number of Quests</label>
                <input
                  type="number"
                  value={editingHighlight.questCount || 0}
                  onChange={(e) => setEditingHighlight({...editingHighlight, questCount: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Logo URL (optional)</label>
                <input
                  type="url"
                  value={editingHighlight.image || ''}
                  onChange={(e) => setEditingHighlight({...editingHighlight, image: e.target.value || undefined})}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="form-group">
                <label>Background Colors</label>
                <div className="color-inputs">
                  <input
                    type="color"
                    value={editingHighlight.gradientColors[0]}
                    onChange={(e) => setEditingHighlight({
                      ...editingHighlight,
                      gradientColors: [e.target.value, editingHighlight.gradientColors[1]]
                    })}
                    title="Primary background color"
                  />
                  <input
                    type="color"
                    value={editingHighlight.gradientColors[1]}
                    onChange={(e) => setEditingHighlight({
                      ...editingHighlight,
                      gradientColors: [editingHighlight.gradientColors[0], e.target.value]
                    })}
                    title="Secondary background color"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingHighlight.isHot || false}
                    onChange={(e) => setEditingHighlight({...editingHighlight, isHot: e.target.checked})}
                  />
                  Mark as HOT
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingHighlight.isTrending || false}
                    onChange={(e) => setEditingHighlight({...editingHighlight, isTrending: e.target.checked})}
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
