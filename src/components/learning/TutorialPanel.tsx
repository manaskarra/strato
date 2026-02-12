'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { TutorialContent } from '@/lib/types';
import { X, BookOpen, CheckCircle2, XCircle, ChevronRight, Award, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialPanelProps {
  tutorial: TutorialContent | null;
  loading: boolean;
  onClose: () => void;
}

export function TutorialPanel({ tutorial, loading, onClose }: TutorialPanelProps) {
  const [mode, setMode] = useState<'tutorial' | 'quiz'>('tutorial');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  const quiz = tutorial?.quiz || [];
  const question = quiz[currentQuestion];
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === question?.correctAnswer;

  const handleAnswer = (idx: number) => { if (isAnswered) return; setSelectedAnswer(idx); setAnswers({ ...answers, [currentQuestion]: idx }); };
  const nextQuestion = () => { if (currentQuestion < quiz.length - 1) { setCurrentQuestion(currentQuestion + 1); setSelectedAnswer(null); } else setShowResult(true); };
  const score = Object.entries(answers).filter(([qIdx, ans]) => quiz[parseInt(qIdx)]?.correctAnswer === ans).length;
  const resetQuiz = () => { setCurrentQuestion(0); setSelectedAnswer(null); setAnswers({}); setShowResult(false); };

  return (
    <div className="w-[380px] border-l border-border bg-card flex flex-col shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-foreground">{mode === 'tutorial' ? 'Tutorial' : 'Quiz'}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Generating personalized tutorial...</p>
          </div>
        </div>
      ) : !tutorial ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">No tutorial available</p>
        </div>
      ) : (
        <>
          <div className="flex p-2 gap-1 border-b border-border">
            <Button variant={mode === 'tutorial' ? 'secondary' : 'ghost'} size="sm" className={cn("flex-1 text-xs gap-1.5", mode === 'tutorial' && 'bg-blue-500/20 text-blue-500')} onClick={() => setMode('tutorial')}>
              <BookOpen className="w-3 h-3" /> Tutorial
            </Button>
            <Button variant={mode === 'quiz' ? 'secondary' : 'ghost'} size="sm" className={cn("flex-1 text-xs gap-1.5", mode === 'quiz' && 'bg-blue-500/20 text-blue-500')} onClick={() => { setMode('quiz'); resetQuiz(); }} disabled={quiz.length === 0}>
              <Award className="w-3 h-3" /> Quiz ({quiz.length})
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {mode === 'tutorial' ? (
              <div className="p-4 space-y-5">
                <h2 className="text-base font-bold text-foreground">{tutorial.title}</h2>
                {tutorial.sections.map((section, idx) => (
                  <div key={idx}>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                      {section.heading}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed pl-7">{section.content}</p>
                  </div>
                ))}
                {quiz.length > 0 && (
                  <div className="pt-3">
                    <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => { setMode('quiz'); resetQuiz(); }}>
                      <Award className="w-4 h-4" /> Take the Quiz
                    </Button>
                  </div>
                )}
              </div>
            ) : showResult ? (
              <div className="p-6 text-center space-y-4">
                <div className={cn('w-20 h-20 rounded-full mx-auto flex items-center justify-center', score >= quiz.length * 0.7 ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                  <Award className={cn('w-10 h-10', score >= quiz.length * 0.7 ? 'text-emerald-500' : 'text-red-500')} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{score}/{quiz.length} Correct</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {score === quiz.length ? 'Perfect! You\'ve mastered this.' : score >= quiz.length * 0.7 ? 'Great job! Solid understanding.' : 'Keep learning! Review the tutorial.'}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setMode('tutorial')}>Review</Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={resetQuiz}>Retry</Button>
                </div>
              </div>
            ) : question ? (
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Question {currentQuestion + 1} of {quiz.length}</span>
                    <span>{Math.round(((currentQuestion + 1) / quiz.length) * 100)}%</span>
                  </div>
                  <Progress value={((currentQuestion + 1) / quiz.length) * 100} className="h-1.5" />
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed">{question.question}</p>
                <div className="space-y-2">
                  {question.options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isCorrectOption = idx === question.correctAnswer;
                    return (
                      <button key={idx} onClick={() => handleAnswer(idx)} disabled={isAnswered}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border text-xs transition-all',
                          !isAnswered && 'hover:bg-muted/50 cursor-pointer border-border',
                          isAnswered && isCorrectOption && 'border-emerald-500/30 bg-emerald-500/5',
                          isAnswered && isSelected && !isCorrectOption && 'border-red-500/30 bg-red-500/5',
                          !isAnswered && isSelected && 'border-blue-500/30 bg-blue-500/5',
                        )}>
                        <div className="flex items-start gap-2">
                          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border',
                            isAnswered && isCorrectOption ? 'bg-emerald-500 text-white border-emerald-500' :
                            isAnswered && isSelected && !isCorrectOption ? 'bg-red-500 text-white border-red-500' :
                            'border-border text-muted-foreground'
                          )}>
                            {isAnswered && isCorrectOption ? <CheckCircle2 className="w-3 h-3" /> :
                             isAnswered && isSelected && !isCorrectOption ? <XCircle className="w-3 h-3" /> :
                             String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-foreground/70">{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {isAnswered && (
                  <div className={cn('p-3 rounded-lg border text-xs leading-relaxed',
                    isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
                  )}>
                    <p className="font-semibold mb-1">{isCorrect ? 'Correct!' : 'Not quite.'}</p>
                    <p>{question.explanation}</p>
                  </div>
                )}
                {isAnswered && (
                  <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700" onClick={nextQuestion}>
                    {currentQuestion < quiz.length - 1 ? <>Next <ChevronRight className="w-3 h-3" /></> : 'See Results'}
                  </Button>
                )}
              </div>
            ) : null}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
