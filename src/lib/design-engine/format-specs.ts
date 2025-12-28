// Output format specifications per Feature 7 spec

export interface FormatSpec {
  id: string;
  name: string;
  category: 'social' | 'print';
  width: number;
  height: number;
  aspectRatio: string;
  dpi: number;
}

export const SOCIAL_FORMATS: FormatSpec[] = [
  {
    id: 'pinterest',
    name: 'Pinterest Pin',
    category: 'social',
    width: 1000,
    height: 1500,
    aspectRatio: '2:3',
    dpi: 72,
  },
  {
    id: 'instagram_post',
    name: 'Instagram Post',
    category: 'social',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    dpi: 72,
  },
  {
    id: 'instagram_story',
    name: 'Instagram Story',
    category: 'social',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    dpi: 72,
  },
];

export const PRINT_FORMATS: FormatSpec[] = [
  {
    id: 'print_8x10',
    name: '8×10"',
    category: 'print',
    width: 2400,
    height: 3000,
    aspectRatio: '4:5',
    dpi: 300,
  },
  {
    id: 'print_11x14',
    name: '11×14"',
    category: 'print',
    width: 3300,
    height: 4200,
    aspectRatio: '11:14',
    dpi: 300,
  },
  {
    id: 'print_16x20',
    name: '16×20"',
    category: 'print',
    width: 4800,
    height: 6000,
    aspectRatio: '4:5',
    dpi: 300,
  },
  {
    id: 'print_12x16',
    name: '12×16"',
    category: 'print',
    width: 3600,
    height: 4800,
    aspectRatio: '3:4',
    dpi: 300,
  },
  {
    id: 'print_18x24',
    name: '18×24"',
    category: 'print',
    width: 5400,
    height: 7200,
    aspectRatio: '3:4',
    dpi: 300,
  },
  {
    id: 'print_12x18',
    name: '12×18"',
    category: 'print',
    width: 3600,
    height: 5400,
    aspectRatio: '2:3',
    dpi: 300,
  },
  {
    id: 'print_16x24',
    name: '16×24"',
    category: 'print',
    width: 4800,
    height: 7200,
    aspectRatio: '2:3',
    dpi: 300,
  },
  {
    id: 'print_24x36',
    name: '24×36"',
    category: 'print',
    width: 7200,
    height: 10800,
    aspectRatio: '2:3',
    dpi: 300,
  },
  {
    id: 'print_a4',
    name: 'A4',
    category: 'print',
    width: 2480,
    height: 3508,
    aspectRatio: '1:1.414',
    dpi: 300,
  },
  {
    id: 'print_a3',
    name: 'A3',
    category: 'print',
    width: 3508,
    height: 4961,
    aspectRatio: '1:1.414',
    dpi: 300,
  },
];

export const ALL_FORMATS = [...SOCIAL_FORMATS, ...PRINT_FORMATS];

export function getFormatSpec(formatId: string): FormatSpec | undefined {
  return ALL_FORMATS.find((f) => f.id === formatId);
}

export function getFormatsByCategory(category: 'social' | 'print'): FormatSpec[] {
  return ALL_FORMATS.filter((f) => f.category === category);
}
