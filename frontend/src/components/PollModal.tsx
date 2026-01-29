import React, { useState } from 'react';

interface PollQuestion {
    id: string;
    type: 'SELECT' | 'TEXT_INPUT';
    question: string;
    multiSelect?: boolean;
    required?: boolean;
    choices?: string[];
}

interface PollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    title: string;
    questions: PollQuestion[];
}

export function PollModal({ isOpen, onClose, onComplete, title, questions }: PollModalProps) {
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [isCompleted, setIsCompleted] = useState(false);

    if (!isOpen) return null;

    const handleSelectAnswer = (questionId: string, choice: string, multiSelect: boolean) => {
        setAnswers(prev => {
            const current = prev[questionId];
            if (multiSelect) {
                const currentArray = Array.isArray(current) ? current : [];
                if (currentArray.includes(choice)) {
                    return { ...prev, [questionId]: currentArray.filter(c => c !== choice) };
                } else {
                    return { ...prev, [questionId]: [...currentArray, choice] };
                }
            } else {
                return { ...prev, [questionId]: choice };
            }
        });
    };

    const handleTextInput = (questionId: string, text: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: text
        }));
    };

    const isFormValid = () => {
        return questions.every(q => {
            // If required (default for polls unless specified otherwise)
            // For text input, rely on explicit required flag or assume required if not specified
            if (q.type === 'TEXT_INPUT') {
                if (q.required !== false) {
                    return !!answers[q.id] && (answers[q.id] as string).trim().length > 0;
                }
                return true;
            }
            // For select, assume required
            const answer = answers[q.id];
            if (Array.isArray(answer)) return answer.length > 0;
            return !!answer;
        });
    };

    const handleSubmit = () => {
        if (!isFormValid()) return;

        setIsCompleted(true);
        setTimeout(() => {
            onComplete();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1f35] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    {isCompleted ? (
                        <div className="text-center py-8 flex flex-col items-center">
                            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
                            <p className="text-gray-400">Your response has been recorded.</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-white">{title || 'Poll'}</h3>
                                <p className="text-sm text-gray-400 mt-1">Please answer the questions below</p>
                            </div>

                            {/* Questions */}
                            <div className="space-y-8 mb-8">
                                {questions.map((q, idx) => (
                                    <div key={q.id}>
                                        <label className="block text-white font-medium mb-3">
                                            <span className="text-gray-500 mr-2">{idx + 1}.</span>
                                            {q.question}
                                            {q.required !== false && <span className="text-red-400 ml-1">*</span>}
                                        </label>

                                        {q.type === 'SELECT' && q.choices && (
                                            <div className="space-y-2 pl-6">
                                                {q.choices.map((choice) => {
                                                    const isSelected = q.multiSelect
                                                        ? (answers[q.id] as string[] || []).includes(choice)
                                                        : answers[q.id] === choice;

                                                    return (
                                                        <button
                                                            key={choice}
                                                            onClick={() => handleSelectAnswer(q.id, choice, !!q.multiSelect)}
                                                            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center gap-3
                                ${isSelected
                                                                    ? 'bg-purple-500/10 border-purple-500/50 text-white'
                                                                    : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
                                                                }
                              `}
                                                        >
                                                            <div className={`w-4 h-4 rounded-${q.multiSelect ? 'sm' : 'full'} border flex items-center justify-center
                                ${isSelected
                                                                    ? 'border-purple-500 bg-purple-500'
                                                                    : 'border-gray-500'
                                                                }
                              `}>
                                                                {isSelected && (
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <span>{choice}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {q.type === 'TEXT_INPUT' && (
                                            <div className="pl-6">
                                                <textarea
                                                    value={answers[q.id] as string || ''}
                                                    onChange={(e) => handleTextInput(q.id, e.target.value)}
                                                    placeholder="Type your answer here..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 min-h-[100px] resize-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <button
                                onClick={handleSubmit}
                                disabled={!isFormValid()}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                  ${!isFormValid()
                                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
                                    }
                `}
                            >
                                Submit Response
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
