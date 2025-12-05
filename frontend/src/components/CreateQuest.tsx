import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuests } from '../hooks/useQuests';
import type { QuestRequirement } from '../types';

export function CreateQuest() {
  const { address } = useAccount();
  const { createQuest, isCreating } = useQuests();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [xpReward, setXpReward] = useState(100);
  const [requirements, setRequirements] = useState<QuestRequirement[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    createQuest({
      projectId: projectId || 'default_project',
      projectName: projectName || 'Default Project',
      title,
      description,
      xpReward,
      requirements,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setProjectId('');
    setProjectName('');
    setXpReward(100);
    setRequirements([]);
  };

  const addRequirement = () => {
    setRequirements([
      ...requirements,
      {
        type: 'custom',
        description: '',
        verification: '',
      },
    ]);
  };

  return (
    <div className="create-quest">
      <h2>Create New Quest</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Project Name</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project Name"
            required
          />
        </div>
        <div className="form-group">
          <label>Project ID</label>
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID (optional)"
          />
        </div>
        <div className="form-group">
          <label>Quest Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quest Title"
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Quest Description"
            required
            rows={4}
          />
        </div>
        <div className="form-group">
          <label>IQ Reward</label>
          <input
            type="number"
            value={xpReward}
            onChange={(e) => setXpReward(Number(e.target.value))}
            placeholder="IQ Reward"
            min={1}
            required
          />
        </div>
        <div className="form-group">
          <label>Requirements</label>
          {requirements.map((req, index) => (
            <div key={index} className="requirement-item">
              <input
                value={req.description}
                onChange={(e) => {
                  const newReqs = [...requirements];
                  newReqs[index].description = e.target.value;
                  setRequirements(newReqs);
                }}
                placeholder="Requirement description"
              />
            </div>
          ))}
          <button type="button" onClick={addRequirement}>
            Add Requirement
          </button>
        </div>
        <button type="submit" disabled={isCreating || !address}>
          {isCreating ? 'Creating...' : 'Create Quest'}
        </button>
      </form>
    </div>
  );
}

