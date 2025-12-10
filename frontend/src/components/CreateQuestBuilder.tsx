import { useState, useEffect, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { useSubscription } from '../hooks/useSubscription';
import { useActiveQuestCount } from '../hooks/useActiveQuestCount';
import { useQuests } from '../hooks/useQuests';
import { useQueryClient } from '@tanstack/react-query';
import { showToast } from './Toast';
// Contract services re-enabled
import { 
  depositToEscrow, 
  checkBalance,
  getQuestDeposit,
  getGracePeriod,
} from '../services/questEscrowService';
import { questDraftService } from '../services/questDraftService';
import { createQuestAtom } from '../services/questAtomService';
import { parseEther } from 'viem';
import { parseUnits, formatUnits, createPublicClient, http } from 'viem';
import { intuitionChain } from '../config/wagmi';
import './CreateQuestBuilder.css';

// Poll Editor Component
interface PollEditorProps {
  config: {
    questions?: Array<{
      id: string;
      type: 'SELECT' | 'TEXT_INPUT';
      question: string;
      multiSelect?: boolean;
      required?: boolean;
      choices?: string[];
    }>;
  };
  onChange: (config: PollEditorProps['config']) => void;
}

// Quiz Editor Component
interface QuizEditorProps {
  config: {
    customTitle?: string;
    questions?: Array<{
      id: string;
      question: string;
      answers?: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
      }>;
    }>;
  };
  onChange: (config: QuizEditorProps['config']) => void;
}

function QuizEditor({ config, onChange }: QuizEditorProps) {
  const [quizConfig, setQuizConfig] = useState(config || {
    questions: []
  });

  useEffect(() => {
    onChange(quizConfig);
  }, [quizConfig, onChange]);

  const addQuestion = () => {
    const newQuestion = {
      id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question: '',
      answers: [
        { id: `answer_${Date.now()}_1`, text: '', isCorrect: false },
        { id: `answer_${Date.now()}_2`, text: '', isCorrect: false }
      ]
    };
    setQuizConfig({
      ...quizConfig,
      questions: [...(quizConfig.questions || []), newQuestion]
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<QuizEditorProps['config']['questions'][0]>) => {
    setQuizConfig({
      ...quizConfig,
      questions: quizConfig.questions?.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      ) || []
    });
  };

  const removeQuestion = (questionId: string) => {
    setQuizConfig({
      ...quizConfig,
      questions: quizConfig.questions?.filter(q => q.id !== questionId) || []
    });
  };

  const addAnswer = (questionId: string) => {
    const question = quizConfig.questions?.find(q => q.id === questionId);
    if (question) {
      const newAnswer = {
        id: `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: '',
        isCorrect: false
      };
      updateQuestion(questionId, {
        answers: [...(question.answers || []), newAnswer]
      });
    }
  };

  const updateAnswer = (questionId: string, answerId: string, updates: Partial<{ text: string; isCorrect: boolean }>) => {
    const question = quizConfig.questions?.find(q => q.id === questionId);
    if (question && question.answers) {
      const updatedAnswers = question.answers.map(a => 
        a.id === answerId ? { ...a, ...updates } : a
      );
      updateQuestion(questionId, { answers: updatedAnswers });
    }
  };

  const removeAnswer = (questionId: string, answerId: string) => {
    const question = quizConfig.questions?.find(q => q.id === questionId);
    if (question && question.answers) {
      const filteredAnswers = question.answers.filter(a => a.id !== answerId);
      updateQuestion(questionId, { answers: filteredAnswers });
    }
  };

  const setCorrectAnswer = (questionId: string, answerId: string) => {
    const question = quizConfig.questions?.find(q => q.id === questionId);
    if (question && question.answers) {
      // Only one answer can be correct, so uncheck all others
      const updatedAnswers = question.answers.map(a => ({
        ...a,
        isCorrect: a.id === answerId
      }));
      updateQuestion(questionId, { answers: updatedAnswers });
    }
  };

  return (
    <div className="quiz-editor">
      <div className="quiz-editor-header">
        <div className="quiz-editor-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <h3 className="quiz-editor-title">Quiz</h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="quiz-editor-help-icon">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>

      {/* Custom Title */}
      <div className="action-editor-custom-title">
        <label className="action-editor-custom-title-label">
          Custom Title
        </label>
        <input
          type="text"
          className="action-editor-custom-title-input"
          placeholder="Enter custom title (optional)"
          value={quizConfig.customTitle || ''}
          onChange={(e) => setQuizConfig({ ...quizConfig, customTitle: e.target.value })}
        />
      </div>

      {/* Questions */}
      <div className="quiz-questions">
        {quizConfig.questions?.map((question, qIndex) => (
          <div key={question.id} className="quiz-question">
            <div className="quiz-question-header">
              <label className="quiz-question-label">
                Question {qIndex + 1}
              </label>
              <button
                className="quiz-question-remove"
                onClick={() => removeQuestion(question.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <input
              type="text"
              className="quiz-question-input"
              placeholder="Enter question"
              value={question.question}
              onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
            />

            <div className="quiz-answers-section">
              <label className="quiz-answers-label">Answers</label>
              <div className="quiz-answers">
                {question.answers?.map((answer, aIndex) => (
                  <div key={answer.id} className="quiz-answer-item">
                    <input
                      type="text"
                      className="quiz-answer-input"
                      placeholder={`Answer ${aIndex + 1}`}
                      value={answer.text}
                      onChange={(e) => updateAnswer(question.id, answer.id, { text: e.target.value })}
                    />
                    <button
                      className={`quiz-answer-correct ${answer.isCorrect ? 'active' : ''}`}
                      onClick={() => setCorrectAnswer(question.id, answer.id)}
                      title="Mark as correct answer"
                    >
                      {answer.isCorrect ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      )}
                    </button>
                    <button
                      className="quiz-answer-remove"
                      onClick={() => removeAnswer(question.id, answer.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  className="quiz-add-answer"
                  onClick={() => addAnswer(question.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add answer
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          className="quiz-add-question"
          onClick={() => addQuestion()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add question
        </button>
      </div>
    </div>
  );
}

function PollEditor({ config, onChange }: PollEditorProps) {
  const [pollConfig, setPollConfig] = useState({
    questions: config?.questions || [],
    customTitle: config?.customTitle || ''
  });

  useEffect(() => {
    onChange(pollConfig);
  }, [pollConfig, onChange]);

  const addQuestion = (type: 'SELECT' | 'TEXT_INPUT') => {
    const newQuestion = {
      id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      question: '',
      ...(type === 'SELECT' ? { multiSelect: false, choices: [''] } : { required: false })
    };
    setPollConfig({
      ...pollConfig,
      questions: [...(pollConfig.questions || []), newQuestion]
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<PollEditorProps['config']['questions'][0]>) => {
    setPollConfig({
      ...pollConfig,
      questions: pollConfig.questions?.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      ) || []
    });
  };

  const removeQuestion = (questionId: string) => {
    setPollConfig({
      ...pollConfig,
      questions: pollConfig.questions?.filter(q => q.id !== questionId) || []
    });
  };

  const addChoice = (questionId: string) => {
    updateQuestion(questionId, {
      choices: [...(pollConfig.questions?.find(q => q.id === questionId)?.choices || []), '']
    });
  };

  const updateChoice = (questionId: string, choiceIndex: number, value: string) => {
    const question = pollConfig.questions?.find(q => q.id === questionId);
    if (question && question.choices) {
      const newChoices = [...question.choices];
      newChoices[choiceIndex] = value;
      updateQuestion(questionId, { choices: newChoices });
    }
  };

  const removeChoice = (questionId: string, choiceIndex: number) => {
    const question = pollConfig.questions?.find(q => q.id === questionId);
    if (question && question.choices) {
      const newChoices = question.choices.filter((_, i) => i !== choiceIndex);
      updateQuestion(questionId, { choices: newChoices });
    }
  };

  return (
    <div className="poll-editor">
      <div className="poll-editor-header">
        <div className="poll-editor-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3 className="poll-editor-title">Poll</h3>
      </div>

      {/* Custom Title */}
      <div className="action-editor-custom-title">
        <label className="action-editor-custom-title-label">
          Custom Title
        </label>
        <input
          type="text"
          className="action-editor-custom-title-input"
          placeholder="Enter custom title (optional)"
          value={pollConfig.customTitle || ''}
          onChange={(e) => setPollConfig({ ...pollConfig, customTitle: e.target.value })}
        />
      </div>

      {/* Questions */}
      <div className="poll-questions">
        {pollConfig.questions?.map((question, qIndex) => (
          <div key={question.id} className="poll-question">
            <div className="poll-question-header">
              <label className="poll-question-label">
                Question {qIndex + 1} {question.type === 'SELECT' ? 'SELECT' : 'TEXT INPUT'}
              </label>
              <div className="poll-question-header-right">
                {question.type === 'SELECT' && (
                  <label className="poll-checkbox-label">
                    <input
                      type="checkbox"
                      checked={question.multiSelect || false}
                      onChange={(e) => updateQuestion(question.id, { multiSelect: e.target.checked })}
                    />
                    <span>Multi-select</span>
                  </label>
                )}
                {question.type === 'TEXT_INPUT' && (
                  <label className="poll-checkbox-label">
                    <input
                      type="checkbox"
                      checked={question.required || false}
                      onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                    />
                    <span>Required</span>
                  </label>
                )}
                <button
                  className="poll-question-remove"
                  onClick={() => removeQuestion(question.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <input
              type="text"
              className="poll-question-input"
              placeholder={question.type === 'SELECT' ? 'Enter question' : 'Enter prompt'}
              value={question.question}
              onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
            />

            {question.type === 'SELECT' && question.choices && (
              <div className="poll-choices">
                {question.choices.map((choice, cIndex) => (
                  <div key={cIndex} className="poll-choice-item">
                    <input
                      type="text"
                      className="poll-choice-input"
                      placeholder={`${cIndex + 1}`}
                      value={choice}
                      onChange={(e) => updateChoice(question.id, cIndex, e.target.value)}
                    />
                    <button
                      className="poll-choice-remove"
                      onClick={() => removeChoice(question.id, cIndex)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  className="poll-add-choice"
                  onClick={() => addChoice(question.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add choice
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          className="poll-add-question"
          onClick={() => addQuestion('SELECT')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add new question
        </button>
      </div>
    </div>
  );
}

// Open Link Editor Component
interface OpenLinkEditorProps {
  config: {
    customTitle?: string;
    link?: string;
    ctaText?: string;
  };
  onChange: (config: OpenLinkEditorProps['config']) => void;
}

function OpenLinkEditor({ config, onChange }: OpenLinkEditorProps) {
  const [linkConfig, setLinkConfig] = useState(config || {
    link: '',
    ctaText: ''
  });

  useEffect(() => {
    onChange(linkConfig);
  }, [linkConfig, onChange]);

  return (
    <div className="open-link-editor">
      <div className="open-link-editor-header">
        <div className="open-link-editor-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </div>
        <h3 className="open-link-editor-title">Open Link</h3>
      </div>

      {/* Custom Title */}
      <div className="action-editor-custom-title">
        <label className="action-editor-custom-title-label">
          Custom Title
        </label>
        <input
          type="text"
          className="action-editor-custom-title-input"
          placeholder="Enter custom title (optional)"
          value={linkConfig.customTitle || ''}
          onChange={(e) => setLinkConfig({ ...linkConfig, customTitle: e.target.value })}
        />
      </div>

      <div className="open-link-editor-fields">
        <div className="open-link-editor-field">
          <label className="open-link-editor-label">
            Link <span className="required-asterisk">*</span>
          </label>
          <input
            type="url"
            className="open-link-editor-input"
            placeholder="https://example.com"
            value={linkConfig.link || ''}
            onChange={(e) => setLinkConfig({ ...linkConfig, link: e.target.value })}
          />
        </div>

        <div className="open-link-editor-field">
          <label className="open-link-editor-label">
            CTA Text <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            className="open-link-editor-input"
            placeholder="Open Link"
            value={linkConfig.ctaText || ''}
            onChange={(e) => setLinkConfig({ ...linkConfig, ctaText: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// Staked on Claim Editor Component
interface StakedOnClaimEditorProps {
  config: {
    customTitle?: string;
    claimId?: string;
    checkAllClaims?: boolean;
  };
  onChange: (config: StakedOnClaimEditorProps['config']) => void;
}

function StakedOnClaimEditor({ config, onChange }: StakedOnClaimEditorProps) {
  const [claimConfig, setClaimConfig] = useState(config || {
    claimId: '',
    checkAllClaims: true
  });


  // Only call onChange when claimConfig actually changes (use ref to prevent infinite loops)
  const prevConfigRef = useRef<string>('');
  const onChangeRef = useRef(onChange);
  const isInitialMount = useRef(true);
  
  // Update ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // Initialize from config on mount only
  useEffect(() => {
    if (isInitialMount.current && config) {
      const initialConfig = {
        claimId: config.claimId || '',
        checkAllClaims: config.checkAllClaims !== undefined ? config.checkAllClaims : true,
        customTitle: config.customTitle
      };
      setClaimConfig(initialConfig);
      prevConfigRef.current = JSON.stringify(initialConfig);
      isInitialMount.current = false;
    }
  }, []);
  
  // Only call onChange when claimConfig actually changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) return;
    const configString = JSON.stringify(claimConfig);
    if (configString !== prevConfigRef.current) {
      prevConfigRef.current = configString;
      onChangeRef.current(claimConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimConfig]);

  return (
    <div className="staked-claim-editor">
      <div className="staked-claim-editor-header">
        <div className="staked-claim-editor-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h3 className="staked-claim-editor-title">Staked on a Claim</h3>
      </div>

      <div className="action-editor-custom-title">
        <label className="action-editor-custom-title-label">
          Custom Title
        </label>
        <input
          type="text"
          className="action-editor-custom-title-input"
          placeholder="Enter custom title (optional)"
          value={claimConfig.customTitle || ''}
          onChange={(e) => setClaimConfig({ ...claimConfig, customTitle: e.target.value })}
        />
      </div>

      <div className="staked-claim-editor-fields">
        <div className="staked-claim-editor-field">
          <label className="staked-claim-editor-label">
            <input
              type="checkbox"
              checked={claimConfig.checkAllClaims || false}
              onChange={(e) => setClaimConfig({ ...claimConfig, checkAllClaims: e.target.checked, claimId: e.target.checked ? '' : claimConfig.claimId })}
            />
            <span style={{ marginLeft: '8px' }}>Check if user has staked on any claim on Intuition chain</span>
          </label>
        </div>
        {!claimConfig.checkAllClaims && (
          <div className="staked-claim-editor-field">
            <label className="staked-claim-editor-label">
              Specific Claim ID <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className="staked-claim-editor-input"
              placeholder="Enter claim ID (atom ID or triple ID)"
              value={claimConfig.claimId || ''}
              onChange={(e) => setClaimConfig({ ...claimConfig, claimId: e.target.value })}
            />
            <p className="staked-claim-editor-hint">Enter the specific claim ID to check for staking</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Hold Token Editor Component
interface HoldTokenEditorProps {
  config: {
    customTitle?: string;
    tokenContractAddress?: string;
    tokenAmount?: string;
  };
  onChange: (config: HoldTokenEditorProps['config']) => void;
}

function HoldTokenEditor({ config, onChange }: HoldTokenEditorProps) {
  const [tokenConfig, setTokenConfig] = useState(config || {
    tokenContractAddress: '',
    tokenAmount: ''
  });

  useEffect(() => {
    onChange(tokenConfig);
  }, [tokenConfig, onChange]);

  return (
    <div className="hold-token-editor">
      <div className="hold-token-editor-header">
        <div className="hold-token-editor-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <h3 className="hold-token-editor-title">Hold a Token</h3>
      </div>

      <div className="action-editor-custom-title">
        <label className="action-editor-custom-title-label">
          Custom Title
        </label>
        <input
          type="text"
          className="action-editor-custom-title-input"
          placeholder="Enter custom title (optional)"
          value={tokenConfig.customTitle || ''}
          onChange={(e) => setTokenConfig({ ...tokenConfig, customTitle: e.target.value })}
        />
      </div>

      <div className="hold-token-editor-fields">
        <div className="hold-token-editor-field">
          <label className="hold-token-editor-label">
            Token Contract Address <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            className="hold-token-editor-input"
            placeholder="0x..."
            value={tokenConfig.tokenContractAddress || ''}
            onChange={(e) => setTokenConfig({ ...tokenConfig, tokenContractAddress: e.target.value })}
          />
          <p className="hold-token-editor-hint">Enter the ERC20 token contract address</p>
        </div>
        <div className="hold-token-editor-field">
          <label className="hold-token-editor-label">
            Minimum Token Amount <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            className="hold-token-editor-input"
            placeholder="0"
            value={tokenConfig.tokenAmount || ''}
            onChange={(e) => setTokenConfig({ ...tokenConfig, tokenAmount: e.target.value })}
          />
          <p className="hold-token-editor-hint">Enter the minimum amount of tokens user must hold</p>
        </div>
      </div>
    </div>
  );
}

// Hold NFT Editor Component
interface HoldNFTEditorProps {
  config: {
    customTitle?: string;
    nftContractAddress?: string;
    nftAmount?: string;
  };
  onChange: (config: HoldNFTEditorProps['config']) => void;
}

function HoldNFTEditor({ config, onChange }: HoldNFTEditorProps) {
  const [nftConfig, setNftConfig] = useState(config || {
    nftContractAddress: '',
    nftAmount: ''
  });

  useEffect(() => {
    onChange(nftConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nftConfig]);

  return (
    <div className="hold-nft-editor">
      <div className="hold-nft-editor-header">
        <div className="hold-nft-editor-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <h3 className="hold-nft-editor-title">Hold an NFT</h3>
      </div>

      <div className="action-editor-custom-title">
        <label className="action-editor-custom-title-label">
          Custom Title
        </label>
        <input
          type="text"
          className="action-editor-custom-title-input"
          placeholder="Enter custom title (optional)"
          value={nftConfig.customTitle || ''}
          onChange={(e) => setNftConfig({ ...nftConfig, customTitle: e.target.value })}
        />
      </div>

      <div className="hold-nft-editor-fields">
        <div className="hold-nft-editor-field">
          <label className="hold-nft-editor-label">
            NFT Contract Address <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            className="hold-nft-editor-input"
            placeholder="0x..."
            value={nftConfig.nftContractAddress || ''}
            onChange={(e) => setNftConfig({ ...nftConfig, nftContractAddress: e.target.value })}
          />
          <p className="hold-nft-editor-hint">Enter the ERC721/ERC1155 NFT contract address</p>
        </div>
        <div className="hold-nft-editor-field">
          <label className="hold-nft-editor-label">
            Minimum NFT Amount <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            className="hold-nft-editor-input"
            placeholder="1"
            value={nftConfig.nftAmount || ''}
            onChange={(e) => setNftConfig({ ...nftConfig, nftAmount: e.target.value })}
          />
          <p className="hold-nft-editor-hint">Enter the minimum number of NFTs user must hold</p>
        </div>
      </div>
    </div>
  );
}

// Wait Editor Component
interface WaitEditorProps {
  config: {
    customTitle?: string;
    amount?: number;
    unit?: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  onChange: (config: WaitEditorProps['config']) => void;
}

function WaitEditor({ config, onChange }: WaitEditorProps) {
  const [waitConfig, setWaitConfig] = useState(config || {
    amount: 0,
    unit: 'seconds'
  });

  useEffect(() => {
    onChange(waitConfig);
  }, [waitConfig, onChange]);

  return (
    <div className="wait-editor">
      <div className="wait-editor-header">
        <div className="wait-editor-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h3 className="wait-editor-title">Wait</h3>
      </div>

      {/* Custom Title */}
      <div className="action-editor-custom-title">
        <label className="action-editor-custom-title-label">
          Custom Title
        </label>
        <input
          type="text"
          className="action-editor-custom-title-input"
          placeholder="Enter custom title (optional)"
          value={waitConfig.customTitle || ''}
          onChange={(e) => setWaitConfig({ ...waitConfig, customTitle: e.target.value })}
        />
      </div>

      <div className="wait-editor-fields">
        <div className="wait-editor-field">
          <label className="wait-editor-label">
            Wait Amount <span className="required-asterisk">*</span>
          </label>
          <input
            type="number"
            className="wait-editor-input"
            placeholder="10"
            min="0"
            value={waitConfig.amount || ''}
            onChange={(e) => setWaitConfig({ ...waitConfig, amount: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="wait-editor-field">
          <label className="wait-editor-label">
            Unit <span className="required-asterisk">*</span>
          </label>
          <select
            className="wait-editor-select"
            value={waitConfig.unit || 'seconds'}
            onChange={(e) => setWaitConfig({ ...waitConfig, unit: e.target.value as 'seconds' | 'minutes' | 'hours' | 'days' })}
          >
            <option value="seconds">seconds</option>
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface CreateQuestBuilderProps {
  onBack: () => void;
  onSave?: () => void;
  onNext?: () => void;
  spaceId?: string;
  draftId?: string;
  isEditingPublishedQuest?: boolean;
  originalQuestId?: string;
}

export function CreateQuestBuilder({ onBack, onSave, onNext, spaceId, draftId, isEditingPublishedQuest = false, originalQuestId }: CreateQuestBuilderProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isFree, isPro } = useSubscription();
  const activeQuestCount = useActiveQuestCount(spaceId);
  const { createQuest, isCreating } = useQuests();
  const queryClient = useQueryClient();
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedActions, setSelectedActions] = useState<any[]>([]);
  const [showEditActionModal, setShowEditActionModal] = useState(false);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  const [showSubscribePopup, setShowSubscribePopup] = useState(false);
  const [hoveredDisabledAction, setHoveredDisabledAction] = useState<string | null>(null);
  const [editingActionConfig, setEditingActionConfig] = useState<{ 
    accountUrl?: string; 
    accountName?: string;
    customTitle?: string;
    pollConfig?: {
      questions?: Array<{
        id: string;
        type: 'SELECT' | 'TEXT_INPUT';
        question: string;
        multiSelect?: boolean;
        required?: boolean;
        choices?: string[];
      }>;
    };
    quizConfig?: {
      questions?: Array<{
        id: string;
        question: string;
        answers?: Array<{
          id: string;
          text: string;
          isCorrect: boolean;
        }>;
      }>;
    };
    openLinkConfig?: {
      link?: string;
      ctaText?: string;
    };
    waitConfig?: {
      amount?: number;
      unit?: 'seconds' | 'minutes' | 'hours' | 'days';
    };
    stakedClaimConfig?: {
      claimId?: string;
      checkAllClaims?: boolean;
    };
    holdTokenConfig?: {
      tokenContractAddress?: string;
      tokenAmount?: string;
    };
    holdNFTConfig?: {
      nftContractAddress?: string;
      nftAmount?: string;
    };
  }>({});
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [questDraftId, setQuestDraftId] = useState<string>(draftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [distributionType, setDistributionType] = useState<'fcfs' | 'raffle'>('fcfs');
  const [numberOfWinners, setNumberOfWinners] = useState<string>('1');
  const [winnerPrizes, setWinnerPrizes] = useState<string[]>([]);
  const [iqPoints, setIqPoints] = useState<string>('');
  const [rewardDeposit, setRewardDeposit] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositStatus, setDepositStatus] = useState<'none' | 'approved' | 'deposited'>('none');
  const [rewardToken, setRewardToken] = useState<'TRUST'>('TRUST');
  const [gracePeriod, setGracePeriod] = useState<bigint | null>(null);

  // Calculate sum of winner prizes
  const calculateWinnerPrizesSum = (): number => {
    const numWinners = parseInt(numberOfWinners, 10) || 0;
    let sum = 0;
    for (let i = 0; i < numWinners; i++) {
      const prize = winnerPrizes[i] || '';
      if (prize.trim()) {
        const prizeValue = parseFloat(prize);
        if (!isNaN(prizeValue) && prizeValue >= 0) {
          sum += prizeValue;
        }
      }
    }
    return sum;
  };

  // Check if winner prizes sum matches total deposit
  const isWinnerPrizesSumValid = (): boolean => {
    // If deposit is empty or invalid, return false
    if (!rewardDeposit || rewardDeposit.trim() === '') {
      return false;
    }
    
    const depositAmount = parseFloat(rewardDeposit);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return false;
    }
    
    // Check if all required prize fields are filled
    const numWinners = parseInt(numberOfWinners, 10) || 0;
    if (numWinners === 0) {
      return false;
    }
    
    // Check if all prize fields are filled
    for (let i = 0; i < numWinners; i++) {
      if (!winnerPrizes[i] || winnerPrizes[i].trim() === '') {
        return false;
      }
    }
    
    const prizesSum = calculateWinnerPrizesSum();
    // Use a small epsilon for floating point comparison
    return Math.abs(depositAmount - prizesSum) < 0.01;
  };

  // Check if an action requires configuration
  const requiresConfiguration = (actionTitle: string): boolean => {
    const configurableActions = [
      'Follow a Twitter account',
      'Make a post on Twitter',
      'Like a post on Twitter',
      'Comment on a post on Twitter',
      'Repost a post on Twitter',
      'Joined Discord Server',
      'Join Discord Server',
      'Poll',
      'Quiz',
      'Open Link',
      'Visit website',
      'Wait',
      'Staked on a claim',
      'Hold a token',
      'Hold an NFT'
    ];
    return configurableActions.some(configurable => actionTitle.includes(configurable) || actionTitle === configurable);
  };

  const isSocialConnectionAction = (actionTitle: string): boolean => {
    const socialActions = [
      'Discord connected',
      'Email connected',
      'Github connected',
      'Twitter connected'
    ];
    return socialActions.includes(actionTitle);
  };

  // Get action type for configuration
  const getActionType = (actionTitle: string): 'twitter' | 'discord' | 'telegram' | null => {
    if (actionTitle.toLowerCase().includes('twitter')) return 'twitter';
    if (actionTitle.toLowerCase().includes('discord')) return 'discord';
    if (actionTitle.toLowerCase().includes('telegram')) return 'telegram';
    return null;
  };

  // Check if an action is properly configured
  const isActionConfigured = (action: any): boolean => {
    if (!requiresConfiguration(action.title)) {
      return true; // Actions that don't require configuration are always "configured"
    }

    // Check different action types
    if (action.title === 'Poll') {
      return !!(action.config?.pollConfig?.questions && action.config.pollConfig.questions.length > 0);
    }
    
    if (action.title === 'Quiz') {
      return !!(action.config?.quizConfig?.questions && action.config.quizConfig.questions.length > 0);
    }
    
    if (action.title === 'Open Link') {
      return !!(action.config?.openLinkConfig?.link && action.config.openLinkConfig.ctaText);
    }
    
    if (action.title === 'Visit website') {
      return !!(action.config?.accountUrl);
    }
    
    if (action.title === 'Wait') {
      return !!(action.config?.waitConfig?.amount && action.config.waitConfig.unit);
    }
    
    // For Twitter and Discord actions
    if (getActionType(action.title)) {
      return !!(action.config?.accountUrl || action.config?.accountName);
    }
    
    // For Joined Discord Server
    if (action.title === 'Joined Discord Server' || action.title === 'Join Discord Server') {
      return !!(action.config?.accountUrl);
    }
    
    // For Staked on a claim
    if (action.title === 'Staked on a claim') {
      const config = action.config?.stakedClaimConfig;
      return !!(config && (config.checkAllClaims || config.claimId));
    }
    
    // For Hold a token
    if (action.title === 'Hold a token') {
      const config = action.config?.holdTokenConfig;
      return !!(config?.tokenContractAddress && config?.tokenAmount);
    }
    
    // For Hold an NFT
    if (action.title === 'Hold an NFT') {
      const config = action.config?.holdNFTConfig;
      return !!(config?.nftContractAddress && config?.nftAmount);
    }
    
    return false;
  };

  const steps = [
        { number: 1, label: 'Details' },
        { number: 2, label: 'Actions' },
        { number: 3, label: 'Rewards' },
        { number: 4, label: 'Deposit' }, // Re-enabled with escrow contracts
    { number: 5, label: 'Preview' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('SVG file size must be less than 5MB');
        return;
      }
      // Check if file is SVG
      const isSVG = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
      if (!isSVG) {
        alert('Please upload an SVG file only');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownIndex !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.create-quest-builder-action-item-menu-container')) {
          setOpenDropdownIndex(null);
        }
      }
    };

    if (openDropdownIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdownIndex]);

  // Load draft on mount if draftId is provided
  useEffect(() => {
    const loadDraft = async () => {
      if (draftId && address) {
        try {
          const draft = await questDraftService.getDraftById(draftId, address);
          if (draft) {
            setTitle(draft.title || '');
            setDifficulty(draft.difficulty || '');
            setDescription(draft.description || '');
            setImagePreview(draft.image_preview || null);
            // Start date/time is set automatically when publishing, so we don't load it from draft
            setEndDate(draft.end_date || '');
            setEndTime(draft.end_time || '');
            // Only load actions if they exist in the draft, otherwise keep empty array
            setSelectedActions(Array.isArray(draft.selected_actions) && draft.selected_actions.length > 0 ? draft.selected_actions : []);
            setWinnerPrizes(Array.isArray(draft.winner_prizes) ? draft.winner_prizes : []);
            setIqPoints(draft.iq_points || '');
            setRewardDeposit(draft.reward_deposit || '');
            setRewardToken(draft.reward_token || 'TRUST');
            setDistributionType(draft.distribution_type || 'fcfs');
            setCurrentStep(draft.current_step || 1);
            setQuestDraftId(draft.id || questDraftId);
            showToast('Draft loaded successfully', 'success');
          } else {
            // If draftId is provided but no draft found, ensure actions are empty
            setSelectedActions([]);
          }
        } catch (error) {
          console.error('Error loading draft:', error);
          // Ensure actions stay empty if there's an error
          setSelectedActions([]);
        }
      } else {
        // If no draftId, ensure actions start empty (new quest)
        setSelectedActions([]);
      }
    };

    loadDraft();
  }, [draftId, address]);

  // Load grace period when on deposit step
  useEffect(() => {
    const loadGracePeriod = async () => {
      if (currentStep === 4 && publicClient) {
        try {
          const period = await getGracePeriod(publicClient);
          setGracePeriod(period);
        } catch (error) {
          console.error('Error loading grace period:', error);
        }
      }
    };
    loadGracePeriod();
  }, [currentStep, publicClient]);

  // Sync winner prizes array with number of winners
  useEffect(() => {
    const numWinners = parseInt(numberOfWinners, 10) || 0;
    if (numWinners > 0) {
      setWinnerPrizes(prevPrizes => {
        const currentPrizes = [...prevPrizes];
        // Add empty strings if array is too short
        while (currentPrizes.length < numWinners) {
          currentPrizes.push('');
        }
        // Remove excess entries if array is too long
        if (currentPrizes.length > numWinners) {
          currentPrizes.splice(numWinners);
        }
        return currentPrizes;
      });
    }
  }, [numberOfWinners]);

  const handleSave = async (showToastNotification: boolean = true) => {
    if (!address) {
      if (showToastNotification) {
        showToast('Please connect your wallet to save', 'warning');
      }
      return;
    }

    try {
      // Save to backend (Supabase) - this handles both create and update
      await questDraftService.saveDraft({
        id: questDraftId,
        user_address: address.toLowerCase(),
        space_id: spaceId || null,
        title: title || null,
        difficulty: difficulty || null,
        description: description || null,
        image_preview: imagePreview || null,
        // Start date/time is set automatically when publishing, so we don't save it in draft
        end_date: endDate || null,
        end_time: endTime || null,
        selected_actions: selectedActions || null,
        number_of_winners: numberOfWinners || null,
        winner_prizes: winnerPrizes || null,
        iq_points: iqPoints || null,
        reward_deposit: rewardDeposit || null,
        reward_token: rewardToken || null,
        distribution_type: distributionType || null,
        current_step: currentStep,
      });

      if (showToastNotification) {
        showToast('Quest draft saved successfully!', 'success');
      }
      onSave?.();
    } catch (error) {
      console.error('Error saving draft:', error);
      if (showToastNotification) {
        showToast('Failed to save draft', 'error');
      }
    }
  };

  // Helper function to add action with free plan restrictions
  const handleAddAction = (action: any) => {
    // Free plan: Limit to 1 action (basic quest types only)
    if (isFree && selectedActions.length >= 1) {
      showToast('Free plan allows only 1 action per quest. Upgrade to Pro for multi-step quests.', 'warning');
      return;
    }
    setSelectedActions([...selectedActions, action]);
    setShowActionsModal(false);
  };

  // Helper function to check if action is restricted for free users
  const isAdvancedAction = (actionTitle: string): boolean => {
    const advancedActions = [
      'Gitcoin Passport Score',
      'TNS minted',
      'Poll',
      'Quiz',
      'Wait'
    ];
    return advancedActions.some(advanced => actionTitle.includes(advanced));
  };

  const handlePublishQuest = async () => {
    if (!address) {
      showToast('Please connect your wallet first', 'warning');
      return;
    }

    setIsPublishing(true);
    let atomId: string | undefined;
    let atomTransactionHash: string | undefined;
    let tripleId: string | undefined;
    let tripleTransactionHash: string | undefined;

    try {
      // Step 1: Check wallet connection and chain
      if (!walletClient || !publicClient) {
        showToast('Please connect your wallet to publish quest', 'error');
        setIsPublishing(false);
        return;
      }

      // Check if user is on Intuition Network (chain ID 1155)
      if (chainId !== intuitionChain.id) {
        showToast('Please switch to Intuition Network to publish quest', 'warning');
        try {
          await switchChain({ chainId: intuitionChain.id });
          // Wait a moment for network switch
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (switchError: any) {
          if (switchError.code !== 4902) { // 4902 = user rejected
            showToast('Failed to switch network. Please switch to Intuition Network manually.', 'error');
          }
          setIsPublishing(false);
          return;
        }
      }

      // Step 2: Create quest atom on-chain
      showToast('Creating quest on-chain...', 'info');
      const client = publicClient || createPublicClient({
        chain: intuitionChain,
        transport: http('https://rpc.intuition.systems'),
      });

      // Get space atom ID if space exists
      let spaceAtomId: string | undefined;
      if (spaceId) {
        try {
          const { spaceServiceSupabase } = await import('../services/spaceServiceSupabase');
          const space = await spaceServiceSupabase.getSpaceById(spaceId);
          spaceAtomId = space?.atomId;
        } catch (error) {
          console.warn('Could not fetch space atom ID:', error);
        }
      }

      // Create quest atom
      const questIdForAtom = questDraftId || `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const atomResult = await createQuestAtom(
        {
          questId: questIdForAtom,
          questTitle: title.trim(),
          spaceAtomId,
        },
        walletClient,
        client
      );

      atomId = atomResult.atomId;
      atomTransactionHash = atomResult.transactionHash;
      tripleId = undefined; // No triple creation for quest publishing
      tripleTransactionHash = undefined;

      // Step 3: Convert image to base64 if present
      let imageBase64: string | undefined;
      if (image) {
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
      }

      // Step 4: Prepare quest requirements from actions
      const requirements = selectedActions.map((action, index) => ({
        type: action.type || 'action',
        description: action.title || `Action ${index + 1}`,
        verification: action.config || {},
        order: index,
      }));

      // Step 5: Calculate XP reward (default to 100 if not set)
      const xpReward = 100; // You can make this configurable

      // Step 6: Get space info for projectId and projectName
      const space = spaceId ? JSON.parse(localStorage.getItem(`space_${spaceId}`) || '{}') : null;
      const projectId = space?.id || `user_${address.toLowerCase()}`;
      const projectName = space?.name || 'Community Quest';

      // Step 7: Publish quest to backend with on-chain data
      showToast('Publishing quest...', 'info');
      createQuest({
        projectId,
        projectName,
        title: title.trim(),
        description: description.trim(),
        xpReward,
        requirements,
        twitterLink: space?.twitterUrl,
      });

      // Step 8: Store quest with on-chain data in localStorage
      // Start date/time is set to current timestamp (when published on-chain)
      const publishedAt = Date.now();
      const startDateStr = new Date(publishedAt).toISOString().split('T')[0];
      const startTimeStr = new Date(publishedAt).toTimeString().split(' ')[0].slice(0, 5);
      
      // Note: tripleId is now undefined since we only create an atom (claim), not a triple
      const questData = {
        id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        projectId,
        projectName,
        spaceId: spaceId || null, // Include spaceId for quest count tracking
        xpReward: iqPoints ? parseInt(iqPoints, 10) : xpReward, // Use iqPoints as xpReward if set
        requirements,
        status: 'active' as const,
        createdAt: publishedAt,
        startAt: publishedAt, // Start time is when published on-chain
        startDate: startDateStr,
        startTime: startTimeStr,
        creatorAddress: address.toLowerCase(),
        atomId,
        atomTransactionHash,
        distributionType,
        tripleId,
        tripleTransactionHash,
        image: imageBase64,
        iqPoints: iqPoints ? parseInt(iqPoints, 10) : (xpReward || 100), // Store iqPoints as set by creator
        numberOfWinners: numberOfWinners ? parseInt(numberOfWinners, 10) : 1,
        winnerPrizes,
        rewardDeposit,
        rewardToken,
        expiresAt: endDate && endTime ? new Date(`${endDate}T${endTime}`).getTime() : undefined,
        endDate,
        endTime,
      };

      // Save to published quests - both Supabase and localStorage (fallback)
      const publishedQuestsKey = `published_quests_${address.toLowerCase()}`;
      const existingPublished = JSON.parse(localStorage.getItem(publishedQuestsKey) || '[]');
      existingPublished.push(questData);
      localStorage.setItem(publishedQuestsKey, JSON.stringify(existingPublished));

      // Also publish to Supabase
      try {
        const { questServiceSupabase } = await import('../services/questServiceSupabase');
        const publishedQuest = await questServiceSupabase.publishQuest(questData);
        console.log('✅ Quest published to Supabase:', publishedQuest);
      } catch (error) {
        console.error('❌ Failed to publish quest to Supabase:', error);
        showToast('Quest published locally but failed to sync to database. Please try again later.', 'warning');
      }

      // Dispatch event to refresh quest counts in space cards
      window.dispatchEvent(new CustomEvent('questPublished', { detail: { spaceId, questData } }));

      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('questPublished', { detail: { quest: questData } }));
      
      // Immediately invalidate and refetch quests to show new quest without lag
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.refetchQueries({ queryKey: ['quests'] });

      // Remove draft if it exists - from both Supabase and localStorage
      if (questDraftId && address) {
        try {
          // Delete from Supabase
          await questDraftService.deleteDraft(questDraftId, address);
        } catch (error) {
          console.warn('Failed to delete draft from Supabase:', error);
        }
        
        // Also remove from localStorage (fallback)
        const draftKey = `quest_draft_${questDraftId}_${address.toLowerCase()}`;
        localStorage.removeItem(draftKey);
        
        // Also remove from drafts list
        const draftsListKey = `quest_drafts_${address.toLowerCase()}`;
        const savedDrafts = localStorage.getItem(draftsListKey);
        if (savedDrafts) {
          try {
            const draftsList: any[] = JSON.parse(savedDrafts);
            const updatedDrafts = draftsList.filter(d => d.id !== questDraftId);
            localStorage.setItem(draftsListKey, JSON.stringify(updatedDrafts));
          } catch (error) {
            console.error('Error removing draft from list:', error);
          }
        }
      }

      showToast('Quest published successfully!', 'success');
      onNext?.();
      onBack(); // Navigate back after publishing
    } catch (error: any) {
      console.error('Error publishing quest:', error);
      showToast(error.message || 'Failed to publish quest. Please try again.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleNext = async () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (
        !title.trim() ||
        !difficulty ||
        !description.trim() ||
        !endDate ||
        !endTime ||
        !numberOfWinners ||
        parseInt(numberOfWinners, 10) < 1
      ) {
        return; // Validation already handled by disabled state
      }
    }
    
    // Validate Rewards step (step 3) - deposit validation disabled
    if (currentStep === 3) {
      // Check if all fields are filled
      const numWinners = parseInt(numberOfWinners, 10) || 0;
      const allPrizesFilled = numWinners > 0 && winnerPrizes.slice(0, numWinners).every((prize, idx) => idx < numWinners && prize && prize.trim() !== '');
      
      if (!allPrizesFilled) {
        showToast('Please fill in all winner prize amounts before proceeding.', 'warning');
        return;
      }
      // Deposit validation disabled - will be reintegrated later
    }
    
    // Validate Actions step (step 2) - check if all actions requiring configuration are configured
    if (currentStep === 2) {
      // Free plan: Limit to 1 action (basic quest types only)
      if (isFree && selectedActions.length > 1) {
        showToast('Free plan allows only 1 action per quest. Upgrade to Pro for multi-step quests.', 'warning');
        return;
      }
      
      // Free plan: Check for advanced actions
      const hasAdvancedActions = selectedActions.some(action => isAdvancedAction(action.title));
      if (isFree && hasAdvancedActions) {
        showToast('Free plan allows only basic quest types. Upgrade to Pro for advanced quest features.', 'warning');
            return;
          }

      const unconfiguredActions = selectedActions.filter(action => !isActionConfigured(action));
      if (unconfiguredActions.length > 0) {
        showToast(`Please configure all actions before proceeding. ${unconfiguredActions.length} action(s) need configuration.`, 'warning');
            return;
          }
    }
    
    // Save progress before moving to next step (async to ensure actions are saved)
    if (address) {
      await handleSave(false); // Auto-save without toast
    }
    
    const maxStep = 5; // Regular quests have 5 steps (Details, Actions, Rewards, Deposit, Preview)
    
    // Check active quest limit before publishing (free plan: max 1 active quest)
    if (currentStep === maxStep && isFree) {
      if (activeQuestCount >= 1) {
        showToast('Free plan allows only 1 active quest at a time. Please pause or complete your existing quest, or upgrade to Pro for unlimited active quests.', 'error');
            return;
          }
    }
    if (currentStep < maxStep) {
      // Normal step progression (Deposit tab is now enabled)
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - publish the quest
      await handlePublishQuest();
    }
  };

  const handlePrevious = async () => {
    if (currentStep > 1) {
      // Save progress before moving to previous step
      if (address) {
        await handleSave(false); // Auto-save without toast
      }
      // Normal step navigation (Deposit tab is now enabled)
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDeposit = async () => {
    if (!address || !walletClient || !publicClient || !rewardDeposit || parseFloat(rewardDeposit) <= 0) {
      showToast('Please connect wallet and enter deposit amount', 'error');
      return;
    }

    if (!questDraftId) {
      showToast('Please save your quest draft first', 'error');
      return;
    }

    setIsDepositing(true);
    try {
      const depositAmount = parseFloat(rewardDeposit);
      const numWinners = parseInt(numberOfWinners, 10) || 0;

      if (numWinners === 0) {
        showToast('Please set number of winners', 'error');
        setIsDepositing(false);
        return;
      }

      // Calculate total cost (no fees)
      const totalCost = parseEther(rewardDeposit);

      // Check user balance - use direct client if publicClient is not available
      const client = publicClient || createPublicClient({
        chain: intuitionChain,
        transport: http('https://rpc.intuition.systems'),
      });
      
      const userBalance = await client.getBalance({
        address: address as `0x${string}`,
      });

      if (userBalance < totalCost) {
        showToast(
          `Insufficient balance. You have ${formatUnits(userBalance, 18)} TRUST, but need ${rewardDeposit} TRUST.`,
          'error'
        );
        setIsDepositing(false);
        return;
      }

      // Calculate quest expiry time
      let expiresAt: number;
      if (endDate && endTime) {
        expiresAt = new Date(`${endDate}T${endTime}`).getTime();
      } else {
        // Default to 30 days from now if no end date specified
        expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
      }
      
      // Validate expiry time is in the future
      if (expiresAt <= Date.now()) {
        showToast('Quest end time must be in the future', 'error');
        setIsDepositing(false);
        return;
      }

      // Deposit to escrow with expiry time and distribution type
      // The rewardDeposit value is the EXACT amount the user entered - this will be deducted from their wallet
      showToast('Depositing to escrow...', 'info');
      const { transactionHash } = await depositToEscrow(
        {
          questId: questDraftId,
          numberOfWinners: numWinners,
          expiresAt,
          distributionType,
        },
        rewardDeposit, // This is the exact amount the user entered in the deposit field
        walletClient,
        client
      );

      setDepositStatus('deposited');
      showToast(`Deposit successful! ${rewardDeposit} TRUST deposited.`, 'success');
    } catch (error: any) {
      console.error('Deposit error:', error);
      showToast(error?.message || 'Deposit failed', 'error');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleStepClick = (stepNumber: number) => {
    // Allow navigation to any step that has been completed or is the current step
    // Also allow going to the next step (stepNumber === currentStep + 1)
    // Step 4 (Deposit) is now enabled
    // Validate before allowing navigation to deposit step
    if (stepNumber === 4 && currentStep < 4) {
      // Ensure rewards step is complete before deposit
      if (!rewardDeposit || parseFloat(rewardDeposit) <= 0) {
        showToast('Please set reward amount before proceeding to deposit', 'warning');
        return;
      }
    }
    if (stepNumber <= currentStep + 1 && stepNumber >= 1) {
      const maxStep = 5;
      if (stepNumber <= maxStep) {
        // If trying to go to step 5 from step 3, allow it (skipping step 4)
        if (stepNumber === 5 && currentStep >= 3) {
          setCurrentStep(5);
        } else if (stepNumber !== 4) {
          setCurrentStep(stepNumber);
        }
      }
    }
  };

  return (
    <div className="create-quest-builder-container">
      <div className="create-quest-builder-header">
        <button className="create-quest-builder-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 className="create-quest-builder-title">{isEditingPublishedQuest ? 'Edit Quest' : 'Create a Quest'}</h1>
      </div>

      {isEditingPublishedQuest && (
        <div style={{
          margin: '0 1.5rem 1.5rem 1.5rem',
          padding: '1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>
            ⚠️ Editing Published Quest
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            You can edit and save quest details. Changes are saved to drafts. To update the quest on-chain and in Supabase, you must republish it.
          </p>
        </div>
      )}

      {/* Progress Steps */}
      <div className="create-quest-builder-steps">
        {steps.filter(step => !step.hidden).map((step) => {
          const isClickable = step.number <= currentStep + 1;
          return (
          <div
            key={step.number}
              className={`create-quest-builder-step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
              onClick={() => isClickable && handleStepClick(step.number)}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
          >
            <span className="create-quest-builder-step-number">{step.number}</span>
            <span className="create-quest-builder-step-label">{step.label}</span>
          </div>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="create-quest-builder-form-card">
        {currentStep === 1 && (
          <div className="create-quest-builder-form">

            {/* Distribution Type - FCFS or Raffle */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">
                Reward Distribution <span className="required-asterisk">*</span>
              </label>
              <div className="create-quest-builder-distribution-options">
                <button
                  type="button"
                  className={`create-quest-builder-distribution-option ${distributionType === 'fcfs' ? 'active' : ''}`}
                  onClick={() => setDistributionType('fcfs')}
                >
                  <div className="create-quest-builder-distribution-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <div className="create-quest-builder-distribution-content">
                    <h4 className="create-quest-builder-distribution-title">First Come First Served (FCFS)</h4>
                    <p className="create-quest-builder-distribution-desc">Rewards are distributed to the first users who complete the quest</p>
                  </div>
                </button>
                <button
                  type="button"
                  className={`create-quest-builder-distribution-option ${distributionType === 'raffle' ? 'active' : ''}`}
                  onClick={() => setDistributionType('raffle')}
                >
                  <div className="create-quest-builder-distribution-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div className="create-quest-builder-distribution-content">
                    <h4 className="create-quest-builder-distribution-title">Raffle</h4>
                    <p className="create-quest-builder-distribution-desc">Winners are randomly selected from all users who complete the quest</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">
                Title <span className="required-asterisk">*</span>
              </label>
              <div className="create-quest-builder-input-wrapper">
                <input
                  type="text"
                  className="create-quest-builder-input"
                  placeholder="Enter title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={64}
                />
                <span className="create-quest-builder-char-count">{title.length}/64</span>
              </div>
              <p className="create-quest-builder-hint">Keep it concise and actionable</p>
            </div>

            {/* Difficulty */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">
                Difficulty <span className="required-asterisk">*</span>
              </label>
              <select
                className="create-quest-builder-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="">Select</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Number of Winners */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">
                Number of Winners <span className="required-asterisk">*</span>
                {isFree && <span style={{ marginLeft: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>(Max 5 for Free plan)</span>}
              </label>
              <input
                type="number"
                className="create-quest-builder-input"
                placeholder="Enter number of winners"
                min="1"
                max={isFree ? 5 : undefined}
                value={numberOfWinners}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (/^\d+$/.test(value) && parseInt(value, 10) > 0)) {
                    const numValue = value === '' ? 1 : parseInt(value, 10);
                    // Free plan: limit to 5 winners
                    if (isFree && numValue > 5) {
                      showToast('Free plan allows maximum 5 winners. Upgrade to Pro for unlimited winners.', 'warning');
                      setNumberOfWinners('5');
                      return;
                    }
                    setNumberOfWinners(value);
                    // Update winner prizes array to match number of winners
                    const currentPrizes = [...winnerPrizes];
                    while (currentPrizes.length < numValue) {
                      currentPrizes.push('');
                    }
                    while (currentPrizes.length > numValue) {
                      currentPrizes.pop();
                    }
                    setWinnerPrizes(currentPrizes);
                  }
                }}
              />
              <p className="create-quest-builder-hint">
                {isFree 
                  ? 'Free plan allows up to 5 winners. Upgrade to Pro for unlimited winners.'
                  : 'Enter the number of winners for this quest'}
              </p>
            </div>

            {/* Description */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">
                Description <span className="required-asterisk">*</span>
              </label>
              <div className="create-quest-builder-textarea-wrapper">
                <textarea
                  className="create-quest-builder-textarea"
                  placeholder="Enter a short description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={6}
                />
                <span className="create-quest-builder-char-count">{description.length}/1000</span>
              </div>
            </div>

            {/* Quest Image */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">Quest Image (SVG Only)</label>
              <p className="create-quest-builder-hint">Upload an SVG file (Scalable Vector Graphics)</p>
              <div className="create-quest-builder-image-upload">
                {imagePreview ? (
                  <div className="create-quest-builder-image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button
                      type="button"
                      className="create-quest-builder-image-remove"
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/svg+xml,.svg"
                      onChange={handleImageUpload}
                      className="create-quest-builder-file-input"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="create-quest-builder-upload-label">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span className="create-quest-builder-upload-text">Upload</span>
                      <span className="create-quest-builder-upload-subtext">Drag or click to upload</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Quest Duration */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">Quest Duration</label>
              <p className="create-quest-builder-hint">Set the duration of the campaign</p>
              
              <div className="create-quest-builder-duration-grid">
                <div className="create-quest-builder-duration-field">
                  <label className="create-quest-builder-label">
                    End Date <span className="required-asterisk">*</span>
                  </label>
                  <div className="create-quest-builder-datetime-wrapper">
                    <input
                      type="date"
                      className="create-quest-builder-input create-quest-builder-datetime-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
                    />
                    <input
                      type="time"
                      className="create-quest-builder-input create-quest-builder-datetime-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  <p className="create-quest-builder-hint">
                    The quest will start automatically when published on-chain
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Actions */}
        {currentStep === 2 && (
          <>
            <div className="create-quest-builder-actions-header">
              <button
                className="create-quest-builder-add-action-top-button"
                onClick={() => setShowActionsModal(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Action
              </button>
            </div>

            {selectedActions.length > 0 ? (
              <div className="create-quest-builder-actions-list">
                {selectedActions.map((action, index) => (
                  <div 
                    key={action.id || index} 
                    className={`create-quest-builder-action-item ${openDropdownIndex === index ? 'dropdown-open' : ''}`}
                  >
                    <div className="create-quest-builder-action-item-number">{index + 1}</div>
                    <div className="create-quest-builder-action-item-content">
                      <h4 className="create-quest-builder-action-item-title">
                        {action.title}
                        {action.optional && (
                          <span className="create-quest-builder-action-item-optional-badge"> (Optional)</span>
                        )}
                        {requiresConfiguration(action.title) && !isActionConfigured(action) && (
                          <span className="create-quest-builder-action-item-warning"> (Needs configuration)</span>
                        )}
                      </h4>
                      {action.config?.accountUrl && (
                        <p className="create-quest-builder-action-item-subtitle">{action.config.accountUrl}</p>
                      )}
                      {action.config?.accountName && !action.config?.accountUrl && (
                        <p className="create-quest-builder-action-item-subtitle">{action.config.accountName}</p>
                      )}
                    </div>
                    <div className="create-quest-builder-action-item-actions">
                      <button
                        className="create-quest-builder-action-item-edit"
                        onClick={() => {
                          if (requiresConfiguration(action.title)) {
                            // Show edit modal for configurable actions
                            setEditingActionIndex(index);
                            setEditingActionConfig(action.config || {});
                            setShowEditActionModal(true);
                          } else {
                            // For non-configurable actions, just show a message or do nothing
                            // Don't remove the action - user can use the dropdown menu to delete if needed
                            showToast('This action does not require configuration', 'info');
                          }
                        }}
                      >
                        Edit
                      </button>
                      <div className="create-quest-builder-action-item-menu-container">
                        <button
                          className="create-quest-builder-action-item-menu"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownIndex(openDropdownIndex === index ? null : index);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                          </svg>
                        </button>
                        {openDropdownIndex === index && (
                          <div className="create-quest-builder-action-item-dropdown">
                            <button
                              className="create-quest-builder-action-item-dropdown-item"
                              onClick={() => {
                                // Free plan: Prevent duplicating actions (multi-step limitation)
                                if (isFree) {
                                  showToast('Free plan allows only 1 action per quest. Upgrade to Pro for multi-step quests.', 'warning');
                                  setOpenDropdownIndex(null);
                                  return;
                                }
                                // Duplicate action
                                const actionToDuplicate = selectedActions[index];
                                const duplicatedAction = {
                                  ...actionToDuplicate,
                                  id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                                };
                                const newActions = [...selectedActions];
                                newActions.splice(index + 1, 0, duplicatedAction);
                                setSelectedActions(newActions);
                                setOpenDropdownIndex(null);
                                showToast('Action duplicated', 'success');
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                              Duplicate
                            </button>
                            <button
                              className="create-quest-builder-action-item-dropdown-item"
                              onClick={() => {
                                // Toggle optional status
                                const updatedActions = [...selectedActions];
                                updatedActions[index] = {
                                  ...updatedActions[index],
                                  optional: !updatedActions[index].optional
                                };
                                setSelectedActions(updatedActions);
                                setOpenDropdownIndex(null);
                                showToast(
                                  updatedActions[index].optional ? 'Action set as optional' : 'Action set as required',
                                  'success'
                                );
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {selectedActions[index].optional ? (
                                  <>
                                    <path d="M9 12l2 2 4-4"/>
                                    <circle cx="12" cy="12" r="10"/>
                                  </>
                                ) : (
                                  <circle cx="12" cy="12" r="10"/>
                                )}
                              </svg>
                              {selectedActions[index].optional ? 'Set as required' : 'Set as optional'}
                            </button>
                            <button
                              className="create-quest-builder-action-item-dropdown-item delete"
                              onClick={() => {
                                // Delete action
                                setSelectedActions(selectedActions.filter((_, i) => i !== index));
                                setOpenDropdownIndex(null);
                                showToast('Action deleted', 'success');
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="create-quest-builder-actions-empty">
                <div className="create-quest-builder-actions-empty-content">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="create-quest-builder-lightning-icon">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <h2 className="create-quest-builder-actions-empty-title">Add first action to your Quest</h2>
                  <p className="create-quest-builder-actions-empty-description">
                    To create a Quest you need to add at least 1 action.
                  </p>
                  <button
                    className="create-quest-builder-add-action-empty-button"
                    onClick={() => setShowActionsModal(true)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add Action
                  </button>
                </div>
              </div>
            )}

            {/* Actions Modal/Popup */}
            {showActionsModal && (
              <>
                <div className="create-quest-builder-modal-overlay" onClick={() => setShowActionsModal(false)}></div>
                <div className="create-quest-builder-actions-modal">
                  <div className="create-quest-builder-actions-modal-header">
                    <h3 className="create-quest-builder-actions-modal-title">Add Action</h3>
                    <button
                      className="create-quest-builder-modal-close"
                      onClick={() => setShowActionsModal(false)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="create-quest-builder-actions-modal-content">
                    {/* Search Bar */}
                    <div className="create-quest-builder-actions-search">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="create-quest-builder-search-icon">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                      <input
                        type="text"
                        placeholder="Search for action..."
                        className="create-quest-builder-search-input"
                      />
                    </div>

                    <div className="create-quest-builder-actions-content">
                      {/* Action Cards Grid - No Categories Sidebar */}
                      <div className="create-quest-builder-actions-grid">
                        {false ? (
                          <>
                            {/* Wallet Actions */}
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 37, title: 'EVM wallet connected' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                                </svg>
                              </div>
                              <h4 className="create-quest-builder-action-title">EVM wallet connected</h4>
                              <p className="create-quest-builder-action-desc">Connect an EVM-compatible wallet</p>
                            </div>
                            
                            {/* Discord Actions */}
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 5, title: 'Discord connected' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon purple">
                                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>@</span>
                              </div>
                              <h4 className="create-quest-builder-action-title">Discord connected</h4>
                              <p className="create-quest-builder-action-desc">Connect a Discord account</p>
                            </div>
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 10, title: 'Joined Discord Server' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                  <circle cx="9" cy="7" r="4"/>
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                              </div>
                              <h4 className="create-quest-builder-action-title">Joined Discord Server</h4>
                              <p className="create-quest-builder-action-desc">Grow your community</p>
                            </div>

                            {/* Twitter Actions */}
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 9, title: 'Twitter connected' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>@</span>
                              </div>
                              <h4 className="create-quest-builder-action-title">Twitter connected</h4>
                              <p className="create-quest-builder-action-desc">Connect a Twitter account</p>
                            </div>
                            <div className="create-quest-builder-action-card" onClick={() => {
                              handleAddAction({ id: 31, title: 'Follow a Twitter account' });
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                  <circle cx="9" cy="7" r="4"/>
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                              </div>
                              <h4 className="create-quest-builder-action-title">Follow a Twitter account</h4>
                              <p className="create-quest-builder-action-desc">Follow a specific Twitter profile</p>
                            </div>
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 32, title: 'Make a post on Twitter' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                  <polyline points="10 9 9 9 8 9"/>
                                </svg>
                              </div>
                              <h4 className="create-quest-builder-action-title">Make a post on Twitter</h4>
                              <p className="create-quest-builder-action-desc">Create and publish a Twitter post</p>
                            </div>
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 33, title: 'Like a post on Twitter' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                              </div>
                              <h4 className="create-quest-builder-action-title">Like a post on Twitter</h4>
                              <p className="create-quest-builder-action-desc">Like a specific Twitter post</p>
                            </div>
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 34, title: 'Comment on a post on Twitter' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                              </div>
                              <h4 className="create-quest-builder-action-title">Comment on a post on Twitter</h4>
                              <p className="create-quest-builder-action-desc">Add a comment to a Twitter post</p>
                            </div>
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 35, title: 'Repost a post on Twitter' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="17 1 21 5 17 9"/>
                                  <path d="M3 11V9a2 2 0 0 1 2-2h16"/>
                                  <polyline points="7 23 3 19 7 15"/>
                                  <path d="M21 13v2a2 2 0 0 1-2 2H3"/>
                                </svg>
                              </div>
                              <h4 className="create-quest-builder-action-title">Repost a post on Twitter</h4>
                              <p className="create-quest-builder-action-desc">Repost a Twitter post to your feed</p>
                            </div>
                            <div className="create-quest-builder-action-card" onClick={() => {
                              setSelectedActions([...selectedActions, { id: 36, title: 'Visit website' }]);
                              setShowActionsModal(false);
                            }}>
                              <div className="create-quest-builder-action-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/>
                                  <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                              </div>
                              <h4 className="create-quest-builder-action-title">Visit website</h4>
                              <p className="create-quest-builder-action-desc">Visit a website URL</p>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Regular Quest Actions - All Actions */}
                        {/* Row 1 */}
                        <div 
                          className="create-quest-builder-action-card disabled" 
                          onClick={() => {
                            showToast('This action is currently disabled', 'warning');
                          }}
                          onMouseEnter={() => {
                            if (isPro) {
                              setHoveredDisabledAction('tns');
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredDisabledAction(null);
                          }}
                          style={{ position: 'relative' }}
                        >
                          {hoveredDisabledAction === 'tns' && isPro && (
                            <div className="coming-soon-tooltip">
                              Coming Soon!
                            </div>
                          )}
                          <div className="create-quest-builder-action-icon purple">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">TNS minted</h4>
                          <p className="create-quest-builder-action-desc">Trust Name Service</p>
                        </div>
                        <div 
                          className="create-quest-builder-action-card disabled" 
                          onClick={() => {
                            showToast('This action is currently disabled', 'warning');
                          }}
                          onMouseEnter={() => {
                            if (isPro) {
                              setHoveredDisabledAction('gitcoin');
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredDisabledAction(null);
                          }}
                          style={{ position: 'relative' }}
                        >
                          {hoveredDisabledAction === 'gitcoin' && isPro && (
                            <div className="coming-soon-tooltip">
                              Coming Soon!
                            </div>
                          )}
                          <div className="create-quest-builder-action-icon blue">
                            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>G</span>
                          </div>
                          <h4 className="create-quest-builder-action-title">Gitcoin Passport Score</h4>
                          <p className="create-quest-builder-action-desc">Apply extra sybil protection</p>
                        </div>

                        {/* Row 2 */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 29, title: 'Have an Intuition identity' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Have an Intuition identity</h4>
                          <p className="create-quest-builder-action-desc">Verify Intuition protocol identity</p>
                        </div>

                        {/* Row 3 */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 5, title: 'Discord connected' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon purple">
                            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>@</span>
                          </div>
                          <h4 className="create-quest-builder-action-title">Discord connected</h4>
                          <p className="create-quest-builder-action-desc">Connect a Discord account</p>
                        </div>
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 6, title: 'Email connected' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon red">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Email connected</h4>
                          <p className="create-quest-builder-action-desc">Connect an email address</p>
                        </div>

                        {/* Row 4 */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 7, title: 'Github connected' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon purple">
                            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>@</span>
                          </div>
                          <h4 className="create-quest-builder-action-title">Github connected</h4>
                          <p className="create-quest-builder-action-desc">Connect a GitHub account</p>
                        </div>
                        {/* Row 5 */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 9, title: 'Twitter connected' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>@</span>
                          </div>
                          <h4 className="create-quest-builder-action-title">Twitter connected</h4>
                          <p className="create-quest-builder-action-desc">Connect a Twitter account</p>
                        </div>
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 10, title: 'Joined Discord Server' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Joined Discord Server</h4>
                          <p className="create-quest-builder-action-desc">Grow your community</p>
                        </div>

                        {/* Row 5.5 - Follow Twitter Account */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 31, title: 'Follow a Twitter account' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Follow a Twitter account</h4>
                          <p className="create-quest-builder-action-desc">Follow a specific Twitter profile</p>
                        </div>

                        {/* Row 5.6 - Make a post on Twitter */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 32, title: 'Make a post on Twitter' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                              <polyline points="10 9 9 9 8 9"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Make a post on Twitter</h4>
                          <p className="create-quest-builder-action-desc">Create and publish a Twitter post</p>
                        </div>

                        {/* Row 5.7 - Like a post on Twitter */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 33, title: 'Like a post on Twitter' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Like a post on Twitter</h4>
                          <p className="create-quest-builder-action-desc">Like a specific Twitter post</p>
                        </div>

                        {/* Row 5.8 - Comment on a post on Twitter */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 34, title: 'Comment on a post on Twitter' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Comment on a post on Twitter</h4>
                          <p className="create-quest-builder-action-desc">Add a comment to a Twitter post</p>
                        </div>

                        {/* Row 5.9 - Repost a post on Twitter */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 35, title: 'Repost a post on Twitter' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="17 1 21 5 17 9"/>
                              <path d="M3 11V9a2 2 0 0 1 2-2h16"/>
                              <polyline points="7 23 3 19 7 15"/>
                              <path d="M21 13v2a2 2 0 0 1-2 2H3"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Repost a post on Twitter</h4>
                          <p className="create-quest-builder-action-desc">Repost a Twitter post to your feed</p>
                        </div>

                        {/* Row 6 */}
                        <div className="create-quest-builder-action-card" onClick={() => {
                          setSelectedActions([...selectedActions, { id: 30, title: 'Staked on a claim' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Staked on a claim</h4>
                          <p className="create-quest-builder-action-desc">Verify staking activity</p>
                        </div>

                        {/* Row 7 - PRO ONLY */}
                        <>
                          <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                            if (isFree) {
                              setShowSubscribePopup(true);
                              return;
                            }
                            setSelectedActions([...selectedActions, { id: 13, title: 'Poll' }]);
                            setShowActionsModal(false);
                          }}>
                            <div className="create-quest-builder-action-icon purple">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                              </svg>
                            </div>
                            <h4 className="create-quest-builder-action-title">Poll {isFree && <span className="pro-badge">Pro</span>}</h4>
                            <p className="create-quest-builder-action-desc">Answer survey questions</p>
                          </div>
                          <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                            if (isFree) {
                              setShowSubscribePopup(true);
                              return;
                            }
                            setSelectedActions([...selectedActions, { id: 14, title: 'Quiz' }]);
                            setShowActionsModal(false);
                          }}>
                            <div className="create-quest-builder-action-icon green">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                <path d="M12 17h.01"/>
                              </svg>
                            </div>
                            <h4 className="create-quest-builder-action-title">Quiz {isFree && <span className="pro-badge">Pro</span>}</h4>
                            <p className="create-quest-builder-action-desc">Test & verify knowledge</p>
                          </div>
                        </>

                        {/* Row 8 - PRO ONLY */}
                        <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                          if (isFree) {
                            setShowSubscribePopup(true);
                            return;
                          }
                          setSelectedActions([...selectedActions, { id: 16, title: 'Open Link' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/>
                              <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Open Link {isFree && <span className="pro-badge">Pro</span>}</h4>
                          <p className="create-quest-builder-action-desc">Visit an external link</p>
                        </div>

                        {/* Row 9 - PRO ONLY */}
                        <>
                          <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                            if (isFree) {
                              setShowSubscribePopup(true);
                              return;
                            }
                            setSelectedActions([...selectedActions, { id: 17, title: 'Quest Completion' }]);
                            setShowActionsModal(false);
                          }}>
                            <div className="create-quest-builder-action-icon blue">
                              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Q</span>
                            </div>
                            <h4 className="create-quest-builder-action-title">Quest Completion {isFree && <span className="pro-badge">Pro</span>}</h4>
                            <p className="create-quest-builder-action-desc">Build progressive engagement</p>
                          </div>
                          <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                            if (isFree) {
                              setShowSubscribePopup(true);
                              return;
                            }
                            setSelectedActions([...selectedActions, { id: 18, title: 'Wait' }]);
                            setShowActionsModal(false);
                          }}>
                            <div className="create-quest-builder-action-icon blue">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                              </svg>
                            </div>
                            <h4 className="create-quest-builder-action-title">Wait {isFree && <span className="pro-badge">Pro</span>}</h4>
                            <p className="create-quest-builder-action-desc">Add a timed waiting period</p>
                          </div>
                        </>

                        {/* Row 10 - PRO ONLY */}
                        <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                          if (isFree) {
                            setShowSubscribePopup(true);
                            return;
                          }
                          setSelectedActions([...selectedActions, { id: 20, title: 'Minted an NFT' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Minted an NFT {isFree && <span className="pro-badge">Pro</span>}</h4>
                          <p className="create-quest-builder-action-desc">Verify NFT minting activity</p>
                        </div>

                        {/* Row 11 - PRO ONLY */}
                        <>
                          <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                            if (isFree) {
                              setShowSubscribePopup(true);
                              return;
                            }
                            setSelectedActions([...selectedActions, { id: 21, title: 'Transfer tokens' }]);
                            setShowActionsModal(false);
                          }}>
                            <div className="create-quest-builder-action-icon blue">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                              </svg>
                            </div>
                            <h4 className="create-quest-builder-action-title">Transfer tokens {isFree && <span className="pro-badge">Pro</span>}</h4>
                            <p className="create-quest-builder-action-desc">Verify token movement</p>
                          </div>
                        </>

                        {/* Row 12 - PRO ONLY */}
                        <>
                          <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                            if (isFree) {
                              setShowSubscribePopup(true);
                              return;
                            }
                            setSelectedActions([...selectedActions, { id: 23, title: 'Hold a token' }]);
                            setShowActionsModal(false);
                          }}>
                            <div className="create-quest-builder-action-icon blue">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                <line x1="1" y1="10" x2="23" y2="10"/>
                              </svg>
                            </div>
                            <h4 className="create-quest-builder-action-title">Hold a token {isFree && <span className="pro-badge">Pro</span>}</h4>
                            <p className="create-quest-builder-action-desc">Verify token ownership</p>
                          </div>
                          <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                            if (isFree) {
                              setShowSubscribePopup(true);
                              return;
                            }
                            setSelectedActions([...selectedActions, { id: 24, title: 'Hold an NFT' }]);
                            setShowActionsModal(false);
                          }}>
                            <div className="create-quest-builder-action-icon blue">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                <line x1="1" y1="10" x2="23" y2="10"/>
                              </svg>
                            </div>
                            <h4 className="create-quest-builder-action-title">Hold an NFT {isFree && <span className="pro-badge">Pro</span>}</h4>
                            <p className="create-quest-builder-action-desc">Enable holder-only benefits</p>
                          </div>
                        </>

                        {/* Row 13 - PRO ONLY */}
                        <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                          if (isFree) {
                            setShowSubscribePopup(true);
                            return;
                          }
                          setSelectedActions([...selectedActions, { id: 26, title: 'Bridge' }]);
                          setShowActionsModal(false);
                        }}>
                          <div className="create-quest-builder-action-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                            </svg>
                          </div>
                          <h4 className="create-quest-builder-action-title">Bridge {isFree && <span className="pro-badge">Pro</span>}</h4>
                          <p className="create-quest-builder-action-desc">Bridge tokens between chains</p>
                        </div>

                        {/* Row 14 - PRO ONLY */}
                        <>
                          <div className={`create-quest-builder-action-card ${isFree ? 'pro-disabled' : ''}`} onClick={() => {
                            if (isFree) {
                              setShowSubscribePopup(true);
                              return;
                            }
                            setSelectedActions([...selectedActions, { id: 27, title: 'Swap' }]);
                            setShowActionsModal(false);
                          }}>
                            <div className="create-quest-builder-action-icon blue">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                              </svg>
                            </div>
                            <h4 className="create-quest-builder-action-title">Swap {isFree && <span className="pro-badge">Pro</span>}</h4>
                            <p className="create-quest-builder-action-desc">Swap tokens</p>
                          </div>
                        </>
                      </>
                    )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Edit Action Configuration Modal */}
            {showEditActionModal && editingActionIndex !== null && (
              <>
                <div className="create-quest-builder-modal-overlay" onClick={() => {
                  setShowEditActionModal(false);
                  setEditingActionIndex(null);
                  setEditingActionConfig({});
                }}></div>
                <div className="create-quest-builder-edit-action-modal">
                  <div className="create-quest-builder-actions-modal-header">
                    <h3 className="create-quest-builder-actions-modal-title">
                      Configure {selectedActions[editingActionIndex]?.title}
                    </h3>
                    <button
                      className="create-quest-builder-modal-close"
                      onClick={() => {
                        setShowEditActionModal(false);
                        setEditingActionIndex(null);
                        setEditingActionConfig({});
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="create-quest-builder-edit-action-modal-content">
                    {selectedActions[editingActionIndex]?.title === 'Poll' && (
                      <PollEditor
                        config={{
                          ...(editingActionConfig.pollConfig || {}),
                          customTitle: editingActionConfig.customTitle
                        }}
                        onChange={(pollConfig) => {
                          setEditingActionConfig({
                            ...editingActionConfig,
                            pollConfig: {
                              questions: pollConfig.questions
                            },
                            customTitle: pollConfig.customTitle
                          });
                        }}
                      />
                    )}
                    {selectedActions[editingActionIndex]?.title === 'Quiz' && (
                      <QuizEditor
                        config={{
                          ...(editingActionConfig.quizConfig || {}),
                          customTitle: editingActionConfig.customTitle
                        }}
                        onChange={(quizConfig) => {
                          setEditingActionConfig({
                            ...editingActionConfig,
                            quizConfig: {
                              questions: quizConfig.questions
                            },
                            customTitle: quizConfig.customTitle
                          });
                        }}
                      />
                    )}
                    {selectedActions[editingActionIndex]?.title === 'Open Link' && (
                      <OpenLinkEditor
                        config={{
                          ...(editingActionConfig.openLinkConfig || {}),
                          customTitle: editingActionConfig.customTitle
                        }}
                        onChange={(openLinkConfig) => {
                          setEditingActionConfig({
                            ...editingActionConfig,
                            openLinkConfig: {
                              link: openLinkConfig.link,
                              ctaText: openLinkConfig.ctaText
                            },
                            customTitle: openLinkConfig.customTitle
                          });
                        }}
                      />
                    )}
                    {selectedActions[editingActionIndex]?.title === 'Visit website' && (
                      <>
                        <div className="create-quest-builder-field">
                          <label className="create-quest-builder-label">
                            Custom Title
                          </label>
                          <input
                            type="text"
                            className="create-quest-builder-input"
                            placeholder="Enter custom title (optional)"
                            value={editingActionConfig.customTitle || ''}
                            onChange={(e) => setEditingActionConfig({ ...editingActionConfig, customTitle: e.target.value })}
                          />
                        </div>
                        <div className="create-quest-builder-field">
                          <label className="create-quest-builder-label">
                            Website URL <span className="required-asterisk">*</span>
                          </label>
                          <input
                            type="url"
                            className="create-quest-builder-input"
                            placeholder="https://example.com"
                            value={editingActionConfig.accountUrl || ''}
                            onChange={(e) => setEditingActionConfig({ ...editingActionConfig, accountUrl: e.target.value })}
                          />
                          <p className="create-quest-builder-hint">Enter the website URL to visit</p>
                        </div>
                      </>
                    )}
                    {selectedActions[editingActionIndex]?.title === 'Wait' && (
                      <WaitEditor
                        config={{
                          ...(editingActionConfig.waitConfig || {}),
                          customTitle: editingActionConfig.customTitle
                        }}
                        onChange={(waitConfig) => {
                          setEditingActionConfig({
                            ...editingActionConfig,
                            waitConfig: {
                              amount: waitConfig.amount,
                              unit: waitConfig.unit
                            },
                            customTitle: waitConfig.customTitle
                          });
                        }}
                      />
                    )}
                    {getActionType(selectedActions[editingActionIndex]?.title) === 'twitter' && (
                      <>
                        <div className="create-quest-builder-field">
                          <label className="create-quest-builder-label">
                            Custom Title
                          </label>
                          <input
                            type="text"
                            className="create-quest-builder-input"
                            placeholder="Enter custom title (optional)"
                            value={editingActionConfig.customTitle || ''}
                            onChange={(e) => setEditingActionConfig({ ...editingActionConfig, customTitle: e.target.value })}
                          />
                        </div>
                        <div className="create-quest-builder-field">
                          <label className="create-quest-builder-label">
                            {selectedActions[editingActionIndex]?.title === 'Follow a Twitter account' 
                              ? 'Twitter Account URL' 
                              : selectedActions[editingActionIndex]?.title === 'Make a post on Twitter'
                              ? 'Post Content or Hashtag'
                              : 'Twitter Post URL'}
                            <span className="required-asterisk">*</span>
                          </label>
                          <input
                            type="text"
                            className="create-quest-builder-input"
                            placeholder={
                              selectedActions[editingActionIndex]?.title === 'Follow a Twitter account'
                                ? 'https://twitter.com/username or @username'
                                : selectedActions[editingActionIndex]?.title === 'Make a post on Twitter'
                                ? 'Enter post content or hashtag to include'
                                : 'https://twitter.com/username/status/1234567890'
                            }
                            value={editingActionConfig.accountUrl || ''}
                            onChange={(e) => setEditingActionConfig({ ...editingActionConfig, accountUrl: e.target.value })}
                          />
                          <p className="create-quest-builder-hint">
                            {selectedActions[editingActionIndex]?.title === 'Follow a Twitter account'
                              ? 'Enter the Twitter profile URL or username'
                              : selectedActions[editingActionIndex]?.title === 'Make a post on Twitter'
                              ? 'Enter the content or hashtag that should be included in the post'
                              : 'Enter the URL of the Twitter post'}
                          </p>
                        </div>
                      </>
                    )}
                    {getActionType(selectedActions[editingActionIndex]?.title) === 'discord' && (
                      <>
                        <div className="create-quest-builder-field">
                          <label className="create-quest-builder-label">
                            Custom Title
                          </label>
                          <input
                            type="text"
                            className="create-quest-builder-input"
                            placeholder="Enter custom title (optional)"
                            value={editingActionConfig.customTitle || ''}
                            onChange={(e) => setEditingActionConfig({ ...editingActionConfig, customTitle: e.target.value })}
                          />
                        </div>
                        <div className="create-quest-builder-field">
                          <label className="create-quest-builder-label">
                            Discord Server Invite URL <span className="required-asterisk">*</span>
                          </label>
                          <input
                            type="text"
                            className="create-quest-builder-input"
                            placeholder="https://discord.gg/invite-code"
                            value={editingActionConfig.accountUrl || ''}
                            onChange={(e) => setEditingActionConfig({ ...editingActionConfig, accountUrl: e.target.value })}
                          />
                          <p className="create-quest-builder-hint">Enter the Discord server invite URL</p>
                        </div>
                      </>
                    )}
                    {selectedActions[editingActionIndex]?.title === 'Staked on a claim' && (
                      <StakedOnClaimEditor
                        config={{
                          ...(editingActionConfig.stakedClaimConfig || {}),
                          customTitle: editingActionConfig.customTitle
                        }}
                        onChange={(stakedClaimConfig) => {
                          setEditingActionConfig({
                            ...editingActionConfig,
                            stakedClaimConfig: {
                              claimId: stakedClaimConfig.claimId,
                              checkAllClaims: stakedClaimConfig.checkAllClaims
                            },
                            customTitle: stakedClaimConfig.customTitle
                          });
                        }}
                      />
                    )}
                    {selectedActions[editingActionIndex]?.title === 'Hold a token' && (
                      <HoldTokenEditor
                        config={{
                          ...(editingActionConfig.holdTokenConfig || {}),
                          customTitle: editingActionConfig.customTitle
                        }}
                        onChange={(holdTokenConfig) => {
                          setEditingActionConfig({
                            ...editingActionConfig,
                            holdTokenConfig: {
                              tokenContractAddress: holdTokenConfig.tokenContractAddress,
                              tokenAmount: holdTokenConfig.tokenAmount
                            },
                            customTitle: holdTokenConfig.customTitle
                          });
                        }}
                      />
                    )}
                    {selectedActions[editingActionIndex]?.title === 'Hold an NFT' && (
                      <HoldNFTEditor
                        config={{
                          ...(editingActionConfig.holdNFTConfig || {}),
                          customTitle: editingActionConfig.customTitle
                        }}
                        onChange={(holdNFTConfig) => {
                          setEditingActionConfig({
                            ...editingActionConfig,
                            holdNFTConfig: {
                              nftContractAddress: holdNFTConfig.nftContractAddress,
                              nftAmount: holdNFTConfig.nftAmount
                            },
                            customTitle: holdNFTConfig.customTitle
                          });
                        }}
                      />
                    )}
                    <div className="create-quest-builder-edit-action-modal-actions">
                      <button
                        className="create-quest-builder-button save"
                        onClick={() => {
                          if (editingActionIndex !== null) {
                            const updatedActions = [...selectedActions];
                            updatedActions[editingActionIndex] = {
                              ...updatedActions[editingActionIndex],
                              config: editingActionConfig
                            };
                            setSelectedActions(updatedActions);
                            setShowEditActionModal(false);
                            setEditingActionIndex(null);
                            setEditingActionConfig({});
                            showToast('Action configuration saved!', 'success');
                          }
                        }}
                        disabled={
                          selectedActions[editingActionIndex]?.title === 'Poll' || 
                          selectedActions[editingActionIndex]?.title === 'Quiz' ||
                          selectedActions[editingActionIndex]?.title === 'Open Link' ||
                          selectedActions[editingActionIndex]?.title === 'Wait'
                            ? false 
                            : selectedActions[editingActionIndex]?.title === 'Visit website'
                            ? !editingActionConfig.accountUrl
                            : selectedActions[editingActionIndex]?.title === 'Staked on a claim'
                            ? !(editingActionConfig.stakedClaimConfig?.checkAllClaims || editingActionConfig.stakedClaimConfig?.claimId)
                            : selectedActions[editingActionIndex]?.title === 'Hold a token'
                            ? !(editingActionConfig.holdTokenConfig?.tokenContractAddress && editingActionConfig.holdTokenConfig?.tokenAmount)
                            : selectedActions[editingActionIndex]?.title === 'Hold an NFT'
                            ? !(editingActionConfig.holdNFTConfig?.nftContractAddress && editingActionConfig.holdNFTConfig?.nftAmount)
                            : !editingActionConfig.accountUrl && !editingActionConfig.accountName
                        }
                      >
                        Save
                      </button>
                      <button
                        className="create-quest-builder-button previous"
                        onClick={() => {
                          setShowEditActionModal(false);
                          setEditingActionIndex(null);
                          setEditingActionConfig({});
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Step 3: Rewards */}
        {currentStep === 3 && (
          <div className="create-quest-builder-form">
            {/* IQ Points Distribution */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">
                IQ Points Distribution <span className="required-asterisk">*</span>
              </label>
              <p className="create-quest-builder-hint">
                Amount of IQ points users will earn for completing this quest
                {difficulty === 'beginner' && ' (Maximum: 25 IQ)'}
                {difficulty === 'intermediate' && ' (Maximum: 50 IQ)'}
                {difficulty === 'advanced' && ' (Maximum: 75 IQ)'}
              </p>
              <input
                type="number"
                min="0"
                max={difficulty === 'beginner' ? 25 : difficulty === 'intermediate' ? 50 : difficulty === 'advanced' ? 75 : 75}
                step="1"
                className="create-quest-builder-input"
                placeholder="Enter IQ points (e.g., 25)"
                value={iqPoints}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = parseInt(value, 10);
                  const maxIQ = difficulty === 'beginner' ? 25 : difficulty === 'intermediate' ? 50 : difficulty === 'advanced' ? 75 : 75;
                  
                  if (value === '') {
                    setIqPoints('');
                  } else if (!isNaN(numValue) && numValue >= 0) {
                    if (numValue > maxIQ) {
                      showToast(`Maximum IQ points for ${difficulty} difficulty is ${maxIQ}`, 'warning');
                      setIqPoints(maxIQ.toString());
                    } else {
                      setIqPoints(value);
                    }
                  }
                }}
              />
            </div>

            {/* Reward Deposit Amount with Token Selection */}
            <div className="create-quest-builder-field">
              <label className="create-quest-builder-label">
                Total Deposit Amount <span className="required-asterisk">*</span>
              </label>
              <p className="create-quest-builder-hint">Amount of TRUST tokens you want to deposit for winners</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="create-quest-builder-input"
                  placeholder="Enter deposit amount"
                  value={rewardDeposit}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty or valid decimal numbers
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setRewardDeposit(value);
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <select
                  className="create-quest-builder-select"
                  value={rewardToken}
                  onChange={(e) => setRewardToken(e.target.value as 'TRUST')}
                  style={{ width: '120px', flexShrink: 0 }}
                >
                  <option value="TRUST">TRUST</option>
                </select>
              </div>
            </div>

            {/* Winner Prizes - Based on number of winners */}
            {numberOfWinners && parseInt(numberOfWinners, 10) > 0 && (
              <div className="create-quest-builder-field">
                <label className="create-quest-builder-label">
                  Winner Prizes <span className="required-asterisk">*</span>
                </label>
                <p className="create-quest-builder-hint">
                  Set the prize amount for each winner
                  {rewardDeposit && (
                    <span style={{ 
                      display: 'block', 
                      marginTop: '0.5rem',
                      color: isWinnerPrizesSumValid() ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                      fontWeight: 500
                    }}>
                      Total Prizes: {calculateWinnerPrizesSum().toFixed(2)} TRUST | 
                      Deposit: {parseFloat(rewardDeposit || '0').toFixed(2)} TRUST
                      {!isWinnerPrizesSumValid() && (
                        <span style={{ display: 'block', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {(() => {
                            const diff = Math.abs(parseFloat(rewardDeposit || '0') - calculateWinnerPrizesSum());
                            const isOver = calculateWinnerPrizesSum() > parseFloat(rewardDeposit || '0');
                            return isOver 
                              ? `⚠️ Prizes exceed deposit by ${diff.toFixed(2)} TRUST`
                              : `⚠️ Prizes are ${diff.toFixed(2)} TRUST less than deposit`;
                          })()}
                        </span>
                      )}
                    </span>
                  )}
                </p>
                <div className="create-quest-builder-winner-prizes">
                  {Array.from({ length: parseInt(numberOfWinners, 10) }, (_, index) => (
                    <div key={index} className="create-quest-builder-winner-prize-item" style={{ marginTop: index > 0 ? '1rem' : '0' }}>
                      <label className="create-quest-builder-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                        Winner {index + 1} Prize
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="create-quest-builder-input"
                          placeholder={`Enter prize amount for winner ${index + 1}`}
                          value={winnerPrizes[index] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              const newPrizes = [...winnerPrizes];
                              newPrizes[index] = value;
                              setWinnerPrizes(newPrizes);
                            }
                          }}
                          style={{ flex: 1 }}
                        />
                        <select
                          className="create-quest-builder-select"
                          value={rewardToken}
                          disabled
                          style={{ width: '120px', flexShrink: 0 }}
                        >
                          <option value="TRUST">TRUST</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Step 4: Deposit */}
        {currentStep === 4 && (
          <div className="create-quest-builder-form">
            <div style={{ display: 'flex', gap: '2rem' }}>
              {/* Left side - Deposit Button */}
              <div style={{ flex: '0 0 200px' }}>
                <button
                  type="button"
                  className="create-quest-builder-button"
                  onClick={handleDeposit}
                  disabled={isDepositing || !rewardDeposit || parseFloat(rewardDeposit) <= 0 || !address || !walletClient || !publicClient}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    opacity: (isDepositing || !rewardDeposit || parseFloat(rewardDeposit) <= 0 || !address || !walletClient || !publicClient) ? 0.5 : 1,
                    cursor: (isDepositing || !rewardDeposit || parseFloat(rewardDeposit) <= 0 || !address || !walletClient || !publicClient) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isDepositing ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '8px', animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Depositing...
                    </>
                  ) : depositStatus === 'deposited' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '8px' }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Deposited
                    </>
                  ) : (
                    'Deposit'
                  )}
                </button>
                {depositStatus === 'deposited' && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'rgba(34, 197, 94, 0.8)', textAlign: 'center' }}>
                    ✓ Deposit successful
                  </p>
                )}
              </div>

              {/* Right side - Deposit Summary */}
              <div style={{ flex: 1 }}>
                <div className="create-quest-builder-field">
                  <label className="create-quest-builder-label">
                    Deposit Summary
                  </label>
                  <p className="create-quest-builder-hint">Review and confirm your deposit</p>
                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'rgba(26, 31, 53, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    marginTop: '1rem'
                  }}>
                    {iqPoints && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>IQ Points Reward:</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                          {iqPoints} IQ
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>Total Deposit:</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                        {rewardDeposit || '0'} {rewardToken || 'TRUST'}
                      </span>
                    </div>
                    <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0.5rem 0' }}>
                        This amount will be deposited to fund the rewards.
                      </p>
                      {gracePeriod !== null && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px' }}>
                          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 0.25rem 0', fontWeight: 500 }}>
                            Grace Period:
                          </p>
                          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                            {gracePeriod > 0n ? (
                              gracePeriod >= 86400n ? (
                                `${Number(gracePeriod) / 86400} day${Number(gracePeriod) / 86400 !== 1 ? 's' : ''}`
                              ) : gracePeriod >= 3600n ? (
                                `${Number(gracePeriod) / 3600} hour${Number(gracePeriod) / 3600 !== 1 ? 's' : ''}`
                              ) : (
                                `${Number(gracePeriod) / 60} minute${Number(gracePeriod) / 60 !== 1 ? 's' : ''}`
                              )
                            ) : 'Not available'}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0.5rem 0 0 0' }}>
                            If the quest expires without winners, you can reclaim funds after this period.
                          </p>
                        </div>
                      )}
                      {winnerPrizes.filter(p => p.trim()).length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem' }}>Prize Distribution:</p>
                          {winnerPrizes.map((prize, idx) => (
                            prize.trim() && (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>Winner {idx + 1}:</span>
                                <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>{prize} {rewardToken}</span>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Preview */}
        {currentStep === 5 && (
          <div className="create-quest-builder-form">
            <div className="create-quest-builder-preview">
              <h3 className="create-quest-builder-preview-title">Preview</h3>
              <div className="create-quest-builder-preview-card">
                {imagePreview && (
                  <img src={imagePreview} alt="Quest" className="create-quest-builder-preview-image" />
                )}
                <div className="create-quest-builder-preview-content">
                  <h4 className="create-quest-builder-preview-name">{title || 'Untitled Quest'}</h4>
                  <p className="create-quest-builder-preview-description">{description || 'No description provided'}</p>
                  <div className="create-quest-builder-preview-meta">
                    {difficulty && (
                      <span className="create-quest-builder-preview-badge">{difficulty}</span>
                    )}
                    {iqPoints && (
                      <span className="create-quest-builder-preview-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                        {iqPoints} IQ
                      </span>
                    )}
                  </div>
                  <p className="create-quest-builder-preview-date">
                    Will start when published on-chain
                  </p>
                  {endDate && endTime && (
                    <p className="create-quest-builder-preview-date">
                      Ends: {new Date(endDate + 'T' + endTime).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="create-quest-builder-actions">
          <div className="create-quest-builder-nav-buttons">
            {currentStep > 1 && (
              <button
                type="button"
                className="create-quest-builder-button previous"
                onClick={handlePrevious}
              >
                Previous
              </button>
            )}
            <button
              type="button"
              className="create-quest-builder-button save"
              onClick={() => handleSave(true)}
            >
              Save
            </button>
            <button
              type="button"
              className="create-quest-builder-button next"
              onClick={currentStep === 5 ? handlePublishQuest : handleNext}
              disabled={
                isPublishing ||
                (currentStep === 1 && (!title.trim() || !difficulty || !description.trim() || !endDate || !endTime || !numberOfWinners || parseInt(numberOfWinners, 10) < 1)) ||
                (currentStep === 2 && selectedActions.some(action => requiresConfiguration(action.title) && !isActionConfigured(action))) ||
                (currentStep === 3 && (!iqPoints || !numberOfWinners || parseInt(numberOfWinners, 10) < 1 || winnerPrizes.some((prize, idx) => idx < parseInt(numberOfWinners, 10) && !prize.trim()))) ||
                (currentStep === 4 && (!rewardDeposit || parseFloat(rewardDeposit) <= 0))
              }
            >
              {isPublishing ? 'Publishing...' : currentStep === 5 ? 'Publish' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Subscribe to Pro Popup */}
      {showSubscribePopup && (
        <>
          <div className="create-quest-builder-modal-overlay" onClick={() => setShowSubscribePopup(false)}></div>
          <div className="create-quest-builder-subscribe-popup">
            <div className="create-quest-builder-subscribe-popup-header">
              <h3 className="create-quest-builder-subscribe-popup-title">Subscribe to Pro</h3>
              <button
                className="create-quest-builder-modal-close"
                onClick={() => setShowSubscribePopup(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="create-quest-builder-subscribe-popup-content">
              <p className="create-quest-builder-subscribe-popup-message">
                This feature is available for Pro users only. Upgrade to Pro to unlock advanced quest actions and features.
              </p>
              <button
                className="create-quest-builder-button primary"
                onClick={() => {
                  setShowSubscribePopup(false);
                  // TODO: Navigate to subscription page or open subscription modal
                  showToast('Redirecting to subscription page...', 'info');
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}