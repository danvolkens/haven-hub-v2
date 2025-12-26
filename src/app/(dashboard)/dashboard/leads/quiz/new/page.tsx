'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Sparkles, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button, Card, CardHeader, CardContent, Input, Label, Textarea } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';

interface QuizAnswer {
  id: string;
  text: string;
  scores: { grounding: number; wholeness: number; growth: number };
}

interface QuizQuestion {
  id: string;
  text: string;
  type: 'single' | 'multiple';
  answers: QuizAnswer[];
}

interface QuizResult {
  collection: 'grounding' | 'wholeness' | 'growth';
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
}

const DEFAULT_RESULTS: QuizResult[] = [
  { collection: 'grounding', title: "You're a Grounding Soul", description: 'You find peace in stability and connection to the earth.', ctaText: 'Shop Grounding Collection', ctaUrl: '/collections/grounding' },
  { collection: 'wholeness', title: "You're a Wholeness Seeker", description: 'You value balance and harmony in all aspects of life.', ctaText: 'Shop Wholeness Collection', ctaUrl: '/collections/wholeness' },
  { collection: 'growth', title: "You're a Growth Mindset", description: 'You embrace change and continuous self-improvement.', ctaText: 'Shop Growth Collection', ctaUrl: '/collections/growth' },
];

export default function NewQuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [requireEmail, setRequireEmail] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: '1',
      text: '',
      type: 'single',
      answers: [
        { id: '1a', text: '', scores: { grounding: 0, wholeness: 0, growth: 0 } },
        { id: '1b', text: '', scores: { grounding: 0, wholeness: 0, growth: 0 } },
      ],
    },
  ]);
  const [results, setResults] = useState<QuizResult[]>(DEFAULT_RESULTS);

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const generateQuestionsWithAI = async () => {
    if (!title) {
      toast('Please enter a quiz title first', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: title,
          description: description || undefined,
          questionCount: 5,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate questions');
      }

      const { questions: generatedQuestions } = await response.json();

      // Convert to our format
      const formattedQuestions: QuizQuestion[] = generatedQuestions.map(
        (q: { text: string; answers: { text: string; scores: { grounding: number; wholeness: number; growth: number } }[] }, idx: number) => ({
          id: String(idx + 1),
          text: q.text,
          type: 'single' as const,
          answers: q.answers.map((a, aidx) => ({
            id: `${idx + 1}${String.fromCharCode(97 + aidx)}`,
            text: a.text,
            scores: a.scores,
          })),
        })
      );

      setQuestions(formattedQuestions);
      toast(`Generated ${formattedQuestions.length} questions with AI!`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to generate questions', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const addQuestion = () => {
    const newId = String(questions.length + 1);
    setQuestions([
      ...questions,
      {
        id: newId,
        text: '',
        type: 'single',
        answers: [
          { id: newId + 'a', text: '', scores: { grounding: 0, wholeness: 0, growth: 0 } },
          { id: newId + 'b', text: '', scores: { grounding: 0, wholeness: 0, growth: 0 } },
        ],
      },
    ]);
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length <= 1) {
      toast('Quiz must have at least one question', 'error');
      return;
    }
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q)));
  };

  const addAnswer = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const letters = 'abcdefghij';
        const newId = questionId + letters[q.answers.length];
        return {
          ...q,
          answers: [
            ...q.answers,
            { id: newId, text: '', scores: { grounding: 0, wholeness: 0, growth: 0 } },
          ],
        };
      })
    );
  };

  const removeAnswer = (questionId: string, answerId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        if (q.answers.length <= 2) {
          toast('Question must have at least 2 answers', 'error');
          return q;
        }
        return { ...q, answers: q.answers.filter((a) => a.id !== answerId) };
      })
    );
  };

  const updateAnswer = (questionId: string, answerId: string, updates: Partial<QuizAnswer>) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          answers: q.answers.map((a) => (a.id === answerId ? { ...a, ...updates } : a)),
        };
      })
    );
  };

  const updateAnswerScore = (
    questionId: string,
    answerId: string,
    collection: keyof QuizAnswer['scores'],
    value: number
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          answers: q.answers.map((a) =>
            a.id === answerId ? { ...a, scores: { ...a.scores, [collection]: value } } : a
          ),
        };
      })
    );
  };

  const updateResult = (collection: string, updates: Partial<QuizResult>) => {
    setResults(results.map((r) => (r.collection === collection ? { ...r, ...updates } : r)));
  };

  const handleSubmit = async () => {
    if (!title || !slug) {
      toast('Please fill in title and slug', 'error');
      return;
    }

    const emptyQuestions = questions.filter((q) => !q.text);
    if (emptyQuestions.length > 0) {
      toast('All questions must have text', 'error');
      return;
    }

    const questionsWithEmptyAnswers = questions.filter((q) =>
      q.answers.some((a) => !a.text)
    );
    if (questionsWithEmptyAnswers.length > 0) {
      toast('All answers must have text', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          slug,
          requireEmail,
          questions: questions.map((q, qi) => ({
            text: q.text,
            type: q.type,
            position: qi,
            answers: q.answers.map((a, ai) => ({
              text: a.text,
              position: ai,
              scores: a.scores,
            })),
          })),
          results: results.map((r) => ({
            collection: r.collection,
            title: r.title,
            description: r.description,
            ctaText: r.ctaText,
            ctaUrl: r.ctaUrl,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create quiz');
      }

      toast('Quiz created successfully!', 'success');
      router.push('/dashboard/leads/quiz');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create quiz', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Create Quiz"
      description="Build an interactive quiz to capture leads"
      actions={
        <div className="flex gap-2">
          <Link href="/dashboard/leads/quiz">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSubmit} isLoading={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>
            Save Quiz
          </Button>
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader title="Quiz Details" />
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug) setSlug(generateSlug(e.target.value));
                }}
                placeholder="Find Your Perfect Collection"
              />
            </div>
            <div>
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="find-your-collection"
              />
              <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
                Quiz will be available at: /quiz/{slug || 'your-slug'}
              </p>
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Discover which collection resonates with your soul..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireEmail"
                checked={requireEmail}
                onChange={(e) => setRequireEmail(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="requireEmail" className="cursor-pointer">
                Require email to see results
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader
            title="Questions"
            description="Add questions with weighted answers for each collection"
          />
          <CardContent className="space-y-6">
            {/* AI Generate Button */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">AI Question Generator</p>
                <p className="text-body-sm text-purple-700 dark:text-purple-300">
                  Let Claude generate quiz questions based on your title
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={generateQuestionsWithAI}
                disabled={isGenerating || !title}
                leftIcon={isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              >
                {isGenerating ? 'Generating...' : 'Generate Questions'}
              </Button>
            </div>

            {questions.map((question, qi) => (
              <div key={question.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-[var(--color-text-tertiary)] mt-2 cursor-move" />
                  <div className="flex-1">
                    <Label>Question {qi + 1}</Label>
                    <Input
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                      placeholder="What brings you peace?"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeQuestion(question.id)}
                    className="text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="pl-8 space-y-3">
                  <Label className="text-caption">Answers</Label>
                  {question.answers.map((answer, ai) => (
                    <div key={answer.id} className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={answer.text}
                          onChange={(e) =>
                            updateAnswer(question.id, answer.id, { text: e.target.value })
                          }
                          placeholder={`Answer ${ai + 1}`}
                        />
                        <div className="flex gap-2">
                          {(['grounding', 'wholeness', 'growth'] as const).map((col) => (
                            <div key={col} className="flex-1">
                              <Label className="text-caption capitalize">{col}</Label>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                value={answer.scores[col]}
                                onChange={(e) =>
                                  updateAnswerScore(
                                    question.id,
                                    answer.id,
                                    col,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeAnswer(question.id, answer.id)}
                        className="text-[var(--color-text-tertiary)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addAnswer(question.id)}
                    leftIcon={<Plus className="h-3 w-3" />}
                  >
                    Add Answer
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="secondary" onClick={addQuestion} leftIcon={<Plus className="h-4 w-4" />}>
              Add Question
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader
            title="Result Pages"
            description="Define what users see for each collection result"
          />
          <CardContent className="space-y-4">
            {results.map((result) => (
              <div key={result.collection} className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium capitalize">{result.collection} Result</h4>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={result.title}
                    onChange={(e) => updateResult(result.collection, { title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={result.description}
                    onChange={(e) => updateResult(result.collection, { description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CTA Button Text</Label>
                    <Input
                      value={result.ctaText}
                      onChange={(e) => updateResult(result.collection, { ctaText: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>CTA URL</Label>
                    <Input
                      value={result.ctaUrl}
                      onChange={(e) => updateResult(result.collection, { ctaUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
