export type BlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'cta'
  | 'quiz_embed'
  | 'product_grid'
  | 'testimonial'
  | 'faq'
  | 'countdown'
  | 'email_capture';

export interface BlockConfig {
  type: BlockType;
  label: string;
  icon: string;
  defaultContent: Record<string, any>;
}

export const BLOCK_CONFIGS: BlockConfig[] = [
  {
    type: 'hero',
    label: 'Hero Section',
    icon: 'Layout',
    defaultContent: {
      headline: 'Your Headline Here',
      subheadline: 'Add a compelling subheadline',
      backgroundImage: null,
      ctaText: 'Get Started',
      ctaLink: '#',
      alignment: 'center',
    },
  },
  {
    type: 'text',
    label: 'Text Block',
    icon: 'Type',
    defaultContent: {
      content: '<p>Your content here...</p>',
      alignment: 'left',
    },
  },
  {
    type: 'image',
    label: 'Image',
    icon: 'Image',
    defaultContent: {
      src: null,
      alt: '',
      caption: '',
      width: 'full',
    },
  },
  {
    type: 'cta',
    label: 'Call to Action',
    icon: 'MousePointer',
    defaultContent: {
      text: 'Click Here',
      link: '#',
      style: 'primary',
      size: 'large',
    },
  },
  {
    type: 'quiz_embed',
    label: 'Quiz Embed',
    icon: 'HelpCircle',
    defaultContent: {
      quizId: null,
      showTitle: true,
    },
  },
  {
    type: 'product_grid',
    label: 'Product Grid',
    icon: 'Grid',
    defaultContent: {
      collection: null,
      columns: 3,
      limit: 6,
      showPrices: true,
    },
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: 'Quote',
    defaultContent: {
      quote: 'Add a customer testimonial here',
      author: 'Customer Name',
      role: 'Happy Customer',
      avatar: null,
    },
  },
  {
    type: 'email_capture',
    label: 'Email Capture',
    icon: 'Mail',
    defaultContent: {
      headline: 'Join our newsletter',
      description: 'Get updates and special offers',
      buttonText: 'Subscribe',
      klaviyoListId: null,
    },
  },
  {
    type: 'countdown',
    label: 'Countdown Timer',
    icon: 'Clock',
    defaultContent: {
      endDate: null,
      expiredText: 'Offer has ended',
      style: 'minimal',
    },
  },
  {
    type: 'faq',
    label: 'FAQ Section',
    icon: 'HelpCircle',
    defaultContent: {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'Question 1?', answer: 'Answer 1' },
        { question: 'Question 2?', answer: 'Answer 2' },
      ],
    },
  },
];

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  order: number;
}
