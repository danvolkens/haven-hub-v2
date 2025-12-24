'use client';

import { ContentBlock } from './block-types';
import { Button } from '@/components/ui/button';

interface BlockRendererProps {
  block: ContentBlock;
  isPreview?: boolean;
}

export function BlockRenderer({ block, isPreview = false }: BlockRendererProps) {
  const { type, content } = block;

  switch (type) {
    case 'hero':
      return (
        <div
          className="relative py-24 px-8"
          style={{
            backgroundImage: content.backgroundImage
              ? `url(${content.backgroundImage})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {content.backgroundImage && (
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div
            className={`relative z-10 max-w-3xl mx-auto text-${content.alignment}`}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {content.headline}
            </h1>
            <p className="text-xl mb-8 opacity-90">{content.subheadline}</p>
            <Button size="lg">{content.ctaText}</Button>
          </div>
        </div>
      );

    case 'text':
      return (
        <div
          className={`py-8 px-8 prose max-w-none text-${content.alignment}`}
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      );

    case 'image':
      return (
        <div className="py-4 px-8">
          {content.src ? (
            <figure>
              <img
                src={content.src}
                alt={content.alt}
                className={`mx-auto ${
                  content.width === 'full' ? 'w-full' : 'max-w-2xl'
                }`}
              />
              {content.caption && (
                <figcaption className="text-center text-sm text-muted-foreground mt-2">
                  {content.caption}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-muted-foreground">
              Click to add image
            </div>
          )}
        </div>
      );

    case 'cta':
      return (
        <div className="py-8 px-8 text-center">
          <Button
            variant={content.style === 'secondary' ? 'secondary' : 'primary'}
            size={content.size === 'large' ? 'lg' : 'md'}
          >
            {content.text}
          </Button>
        </div>
      );

    case 'testimonial':
      return (
        <div className="py-12 px-8">
          <blockquote className="max-w-2xl mx-auto text-center">
            <p className="text-xl italic mb-4">&quot;{content.quote}&quot;</p>
            <footer className="flex items-center justify-center gap-3">
              {content.avatar && (
                <img
                  src={content.avatar}
                  alt={content.author}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <div className="font-semibold">{content.author}</div>
                <div className="text-sm text-muted-foreground">
                  {content.role}
                </div>
              </div>
            </footer>
          </blockquote>
        </div>
      );

    case 'email_capture':
      return (
        <div className="py-12 px-8 bg-sage-50">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-2xl font-bold mb-2">{content.headline}</h3>
            <p className="text-muted-foreground mb-4">{content.description}</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg border"
                disabled={isPreview}
              />
              <Button>{content.buttonText}</Button>
            </div>
          </div>
        </div>
      );

    case 'quiz_embed':
      return (
        <div className="py-8 px-8">
          <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
            {content.quizId ? (
              <p>Quiz Embed: {content.quizId}</p>
            ) : (
              <p>Select a quiz to embed</p>
            )}
          </div>
        </div>
      );

    case 'product_grid':
      return (
        <div className="py-8 px-8">
          <div className={`grid grid-cols-${content.columns} gap-4`}>
            {Array.from({ length: content.limit }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-muted-foreground"
              >
                Product {i + 1}
              </div>
            ))}
          </div>
        </div>
      );

    case 'faq':
      return (
        <div className="py-8 px-8">
          <h3 className="text-2xl font-bold mb-6 text-center">{content.title}</h3>
          <div className="max-w-2xl mx-auto space-y-4">
            {content.items?.map((item: any, i: number) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="font-semibold">{item.question}</div>
                <div className="text-muted-foreground mt-2">{item.answer}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'countdown':
      return (
        <div className="py-8 px-8 text-center">
          <div className="flex justify-center gap-4">
            {['Days', 'Hours', 'Minutes', 'Seconds'].map((unit) => (
              <div key={unit} className="text-center">
                <div className="text-4xl font-bold">00</div>
                <div className="text-sm text-muted-foreground">{unit}</div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="py-4 px-8 text-muted-foreground">
          Unknown block type: {type}
        </div>
      );
  }
}
