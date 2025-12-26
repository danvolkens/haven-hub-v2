import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getApiUserId } from '@/lib/auth/session';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  topic: string;
  description?: string;
  questionCount?: number;
}

interface GeneratedQuestion {
  text: string;
  answers: {
    text: string;
    scores: { grounding: number; wholeness: number; growth: number };
  }[];
}

export async function POST(request: NextRequest) {
  try {
    await getApiUserId(); // Ensure authenticated

    const { topic, description, questionCount = 5 }: GenerateRequest = await request.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const prompt = `You are creating a personality quiz for a wellness brand called Haven & Hold that sells quote-based products. The brand has 3 collections:

1. **Grounding** - For people who value stability, nature, rootedness, calm, presence, and connection to earth
2. **Wholeness** - For people who value balance, harmony, integration, self-acceptance, and inner peace
3. **Growth** - For people who value change, transformation, learning, ambition, and self-improvement

Create ${questionCount} quiz questions for a quiz about: "${topic}"
${description ? `Additional context: ${description}` : ''}

Each question should have 3-4 answer options. Each answer should have scores (0-10) for how much it aligns with each collection.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "text": "Question text here?",
      "answers": [
        {
          "text": "Answer option 1",
          "scores": { "grounding": 8, "wholeness": 3, "growth": 2 }
        },
        {
          "text": "Answer option 2",
          "scores": { "grounding": 2, "wholeness": 8, "growth": 4 }
        },
        {
          "text": "Answer option 3",
          "scores": { "grounding": 3, "wholeness": 4, "growth": 9 }
        }
      ]
    }
  ]
}

Make questions engaging, personal, and relevant to the topic. Each answer should clearly lean toward one collection but can have secondary alignments. Scores should be thoughtful - not just 10/0/0.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const questions: GeneratedQuestion[] = parsed.questions;

    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format');
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
