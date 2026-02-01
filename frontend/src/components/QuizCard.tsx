
import React, { useState, useEffect } from 'react';
import './QuizCard.css';

interface QuizConfig {
    questions: {
        question: string;
        // Support both formats for backward compatibility if needed, or just switch to new one
        options?: string[];
        correctAnswer?: string;
        correctAnswerIndex?: number;
        // New format found in debug info
        answers?: {
            id: string;
            text: string;
            isCorrect: boolean;
        }[];
    }[];
    passingScore?: number;
}

interface QuizCardProps {
    step: any;
    quizConfig: QuizConfig;
    onVerify: (stepId: string) => void;
    isVerified: boolean;
}

export const QuizCard: React.FC<QuizCardProps> = ({ step, quizConfig, onVerify, isVerified }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({}); // questionIndex -> optionIndex
    const [isCompleted, setIsCompleted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // If already verified, show as completed
    useEffect(() => {
        if (isVerified) {
            setIsCompleted(true);
        }
    }, [isVerified]);

    const questions = quizConfig?.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;

    // Helper to get options regardless of format
    const getOptions = (question: any) => {
        if (question.answers) {
            return question.answers.map((a: any) => a.text);
        }
        return question.options || [];
    };

    const handleStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setHasStarted(true);
        setErrorMessage(null);
    };

    const handleOptionSelect = (optionIndex: number) => {
        setErrorMessage(null);
        setSelectedAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: optionIndex
        }));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        // Validate answers
        let correctCount = 0;
        questions.forEach((q, idx) => {
            const selectedIdx = selectedAnswers[idx];

            // Validation for new format (answers object)
            if (q.answers) {
                if (q.answers[selectedIdx]?.isCorrect) {
                    correctCount++;
                }
            }
            // Validation for old/simple format
            else if (q.correctAnswerIndex !== undefined) {
                if (selectedIdx === q.correctAnswerIndex) correctCount++;
            } else if (q.correctAnswer) {
                const options = getOptions(q);
                if (options[selectedIdx] === q.correctAnswer) correctCount++;
            }
        });

        const passingScore = quizConfig.passingScore || questions.length;
        if (correctCount >= passingScore) {
            onVerify(step.id);
            setIsCompleted(true);
            setIsExpanded(false);
        } else {
            setErrorMessage(`You got ${correctCount}/${totalQuestions} correct. Please try again.`);
            setCurrentQuestionIndex(0);
            setSelectedAnswers({});
        }
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // determine current options for rendering
    const currentOptions = currentQuestion ? getOptions(currentQuestion) : [];

    return (
        <div className={`quiz-card-container ${isExpanded ? 'expanded' : ''} ${isCompleted ? 'completed' : ''}`}>
            {/* Header / Collapsed View */}
            <div className="quiz-card-header" onClick={toggleExpand}>
                <div className="quiz-card-header-left">
                    <div className={`quiz-card-caret ${isExpanded ? 'open' : ''}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </div>
                    <div className="quiz-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 12h20M2 12l4-4m0 8l-4-4" transform="rotate(180 12 12)" /> {/* Placeholder pencil/quiz icon */}
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <path d="M12 17h.01" />
                        </svg>
                    </div>
                    <div className="quiz-card-title">
                        <span className="quiz-prefix">Quiz :</span> {step.description || step.title}
                    </div>
                </div>

                <div className="quiz-card-header-right">
                    {isCompleted && (
                        <div className="quiz-verified-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </div>
                    )}
                    {!isExpanded && !isCompleted && (
                        <button className="quiz-start-btn" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); setHasStarted(true); }}>
                            Start
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="quiz-card-content">
                    {!hasStarted ? (
                        <div className="quiz-intro">
                            <p className="quiz-intro-text">Test your knowledge with this {questions.length}-question quiz.</p>
                            <button
                                className="quiz-start-action-btn"
                                onClick={handleStart}
                                disabled={questions.length === 0}
                                style={{ opacity: questions.length === 0 ? 0.5 : 1, cursor: questions.length === 0 ? 'not-allowed' : 'pointer' }}
                            >
                                {questions.length === 0 ? 'No Questions Available' : 'Start Quiz'}
                            </button>
                        </div>
                    ) : (
                        <div className="quiz-question-container">
                            <div className="quiz-question-header">
                                <span className="quiz-question-number">Question {currentQuestionIndex + 1}:</span>
                                <span className="quiz-question-text">{currentQuestion?.question || 'Question text missing'}</span>
                            </div>

                            <div className="quiz-options-list">
                                {currentOptions.map((option: string, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`quiz-option-item ${selectedAnswers[currentQuestionIndex] === idx ? 'selected' : ''}`}
                                        onClick={() => handleOptionSelect(idx)}
                                    >
                                        <div className="quiz-radio-circle">
                                            {selectedAnswers[currentQuestionIndex] === idx && <div className="quiz-radio-fill" />}
                                        </div>
                                        <span className="quiz-option-letter">{String.fromCharCode(65 + idx)}.</span>
                                        <span className="quiz-option-text">{option}</span>
                                    </div>
                                ))}
                                {currentOptions.length === 0 && (
                                    <div style={{ color: 'red' }}>Error: No options found for this question. <br />Debug info: {JSON.stringify(currentQuestion)}</div>
                                )}
                            </div>

                            {errorMessage && (
                                <div style={{ color: '#ef4444', marginTop: '12px', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>
                                    {errorMessage}
                                </div>
                            )}

                            <div className="quiz-footer">
                                <button
                                    className="quiz-next-btn"
                                    onClick={handleNext}
                                    disabled={selectedAnswers[currentQuestionIndex] === undefined}
                                >
                                    {currentQuestionIndex === totalQuestions - 1 ? 'Submit' : 'Next'}
                                </button>
                                <span className="quiz-progress">{currentQuestionIndex + 1}/{totalQuestions}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
