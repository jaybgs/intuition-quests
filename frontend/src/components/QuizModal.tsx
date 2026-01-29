import React, { useState } from 'react';

interface QuizQuestion {
    id: string;
    question: string;
    answers: {
        id: string;
        text: string;
        isCorrect: boolean;
    }[];
}

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    title: string;
    questions: QuizQuestion[];
}

export function QuizModal({ isOpen, onClose, onComplete, title, questions }: QuizModalProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [showError, setShowError] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    if (!isOpen) return null;

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    const handleAnswerSelect = (answerId: string) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: answerId
        }));
        setShowError(false);
    };

    const handleNext = () => {
        const selectedAnswerId = selectedAnswers[currentQuestion.id];
        if (!selectedAnswerId) return;

        // Validate answer
        const correctAnswer = currentQuestion.answers.find(a => a.isCorrect);
        if (selectedAnswerId !== correctAnswer?.id) {
            setShowError(true);
            return;
        }

        if (isLastQuestion) {
            setIsCompleted(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1f35] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="p-6 md:p-8">
                    {isCompleted ? (
                        <div className="text-center py-8 flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Quiz Completed!</h3>
                            <p className="text-gray-400">You've successfully answered all questions.</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xl font-bold text-white">{title || 'Quiz'}</h3>
                                    <span className="text-sm text-gray-400 font-medium">
                                        Question {currentQuestionIndex + 1} of {totalQuestions}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Question */}
                            <div className="mb-8">
                                <h4 className="text-lg text-white font-medium mb-4">{currentQuestion.question}</h4>

                                <div className="space-y-3">
                                    {currentQuestion.answers.map((answer) => (
                                        <button
                                            key={answer.id}
                                            onClick={() => handleAnswerSelect(answer.id)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group
                        ${selectedAnswers[currentQuestion.id] === answer.id
                                                    ? 'bg-blue-500/10 border-blue-500/50 text-white'
                                                    : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
                                                }
                        ${showError && selectedAnswers[currentQuestion.id] === answer.id ? '!border-red-500/50 !bg-red-500/10' : ''}
                      `}
                                        >
                                            <span>{answer.text}</span>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center
                        ${selectedAnswers[currentQuestion.id] === answer.id
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-500 group-hover:border-gray-400'
                                                }
                        ${showError && selectedAnswers[currentQuestion.id] === answer.id ? '!border-red-500 !bg-red-500' : ''}
                      `}>
                                                {selectedAnswers[currentQuestion.id] === answer.id && (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                        {showError ? <line x1="18" y1="6" x2="6" y2="18" /> : <polyline points="20 6 9 17 4 12" />}
                                                        {showError && <line x1="6" y1="6" x2="18" y2="18" />}
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {showError && (
                                    <div className="mt-4 flex items-center gap-2 text-red-400 text-sm animate-shake">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <span>Incorrect answer. Please try again.</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <button
                                onClick={handleNext}
                                disabled={!selectedAnswers[currentQuestion.id]}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                  ${!selectedAnswers[currentQuestion.id]
                                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    }
                `}
                            >
                                {isLastQuestion ? 'Complete Quiz' : 'Next Question'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
