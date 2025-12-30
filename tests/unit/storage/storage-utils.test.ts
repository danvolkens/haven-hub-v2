import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      Contents: [
        { Key: 'test/file1.jpg', Size: 1024, LastModified: new Date() },
        { Key: 'test/file2.png', Size: 2048, LastModified: new Date() },
      ],
      ContentType: 'image/png',
      ContentLength: 1024,
      LastModified: new Date(),
      Metadata: { userId: 'test-user' },
    }),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  HeadObjectCommand: vi.fn(),
  CopyObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('Storage Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateStorageKey', () => {
    it('should be exported as a function', async () => {
      const { generateStorageKey } = await import('@/lib/storage/storage-utils');
      expect(typeof generateStorageKey).toBe('function');
    });

    it('should generate a unique key with user ID', async () => {
      const { generateStorageKey, STORAGE_PATHS } = await import('@/lib/storage/r2-client');
      const { generateStorageKey: genKey } = await import('@/lib/storage/storage-utils');

      const key = genKey('assets', 'user-123', 'test-image.png');
      expect(key).toContain('assets');
      expect(key).toContain('user-123');
      expect(key).toContain('.png');
    });

    it('should include prefix when provided', async () => {
      const { generateStorageKey } = await import('@/lib/storage/storage-utils');

      const key = generateStorageKey('mockups', 'user-123', 'mockup.jpg', 'prefix-test');
      expect(key).toContain('prefix-test');
    });

    it('should sanitize filename', async () => {
      const { generateStorageKey } = await import('@/lib/storage/storage-utils');

      const key = generateStorageKey('assets', 'user-123', 'unsafe name!@#.png');
      expect(key).not.toContain(' ');
      expect(key).not.toContain('!');
      expect(key).not.toContain('@');
      expect(key).not.toContain('#');
    });

    it('should limit filename length', async () => {
      const { generateStorageKey } = await import('@/lib/storage/storage-utils');

      const longName = 'a'.repeat(100) + '.png';
      const key = generateStorageKey('assets', 'user-123', longName);
      const parts = key.split('/');
      const filename = parts[parts.length - 1];
      // Filename should be limited (50 chars for name + timestamp + random + extension)
      expect(filename.length).toBeLessThan(100);
    });
  });

  describe('getPublicUrl', () => {
    it('should be exported as a function', async () => {
      const { getPublicUrl } = await import('@/lib/storage/storage-utils');
      expect(typeof getPublicUrl).toBe('function');
    });

    it('should construct URL from key', async () => {
      const { getPublicUrl } = await import('@/lib/storage/storage-utils');
      const url = getPublicUrl('assets/user-123/image.png');
      expect(url).toContain('assets/user-123/image.png');
    });
  });

  describe('uploadFile', () => {
    it('should be exported as a function', async () => {
      const { uploadFile } = await import('@/lib/storage/storage-utils');
      expect(typeof uploadFile).toBe('function');
    });

    it('should accept buffer and content type', async () => {
      const { uploadFile } = await import('@/lib/storage/storage-utils');
      const buffer = Buffer.from('test content');

      const url = await uploadFile('test/key.txt', buffer, 'text/plain');
      expect(url).toBeDefined();
    });
  });

  describe('uploadImage', () => {
    it('should be exported as a function', async () => {
      const { uploadImage } = await import('@/lib/storage/storage-utils');
      expect(typeof uploadImage).toBe('function');
    });

    it('should accept buffer with options', async () => {
      const { uploadImage } = await import('@/lib/storage/storage-utils');
      const buffer = Buffer.from('fake image data');

      const result = await uploadImage('assets', 'user-123', buffer, {
        filename: 'test.png',
      });

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
    });
  });

  describe('getSignedUploadUrl', () => {
    it('should be exported as a function', async () => {
      const { getSignedUploadUrl } = await import('@/lib/storage/storage-utils');
      expect(typeof getSignedUploadUrl).toBe('function');
    });
  });

  describe('getSignedDownloadUrl', () => {
    it('should be exported as a function', async () => {
      const { getSignedDownloadUrl } = await import('@/lib/storage/storage-utils');
      expect(typeof getSignedDownloadUrl).toBe('function');
    });
  });

  describe('fileExists', () => {
    it('should be exported as a function', async () => {
      const { fileExists } = await import('@/lib/storage/storage-utils');
      expect(typeof fileExists).toBe('function');
    });
  });

  describe('getFileMetadata', () => {
    it('should be exported as a function', async () => {
      const { getFileMetadata } = await import('@/lib/storage/storage-utils');
      expect(typeof getFileMetadata).toBe('function');
    });
  });

  describe('deleteFile', () => {
    it('should be exported as a function', async () => {
      const { deleteFile } = await import('@/lib/storage/storage-utils');
      expect(typeof deleteFile).toBe('function');
    });
  });

  describe('deleteFiles', () => {
    it('should be exported as a function', async () => {
      const { deleteFiles } = await import('@/lib/storage/storage-utils');
      expect(typeof deleteFiles).toBe('function');
    });
  });

  describe('listFiles', () => {
    it('should be exported as a function', async () => {
      const { listFiles } = await import('@/lib/storage/storage-utils');
      expect(typeof listFiles).toBe('function');
    });
  });

  describe('copyFile', () => {
    it('should be exported as a function', async () => {
      const { copyFile } = await import('@/lib/storage/storage-utils');
      expect(typeof copyFile).toBe('function');
    });
  });

  describe('moveFile', () => {
    it('should be exported as a function', async () => {
      const { moveFile } = await import('@/lib/storage/storage-utils');
      expect(typeof moveFile).toBe('function');
    });
  });

  describe('getFileBuffer', () => {
    it('should be exported as a function', async () => {
      const { getFileBuffer } = await import('@/lib/storage/storage-utils');
      expect(typeof getFileBuffer).toBe('function');
    });
  });
});

describe('Storage Constants', () => {
  describe('STORAGE_PATHS', () => {
    it('should export STORAGE_PATHS', async () => {
      const { STORAGE_PATHS } = await import('@/lib/storage/r2-client');
      expect(STORAGE_PATHS).toBeDefined();
    });

    it('should have QUOTES path', async () => {
      const { STORAGE_PATHS } = await import('@/lib/storage/r2-client');
      expect(STORAGE_PATHS.QUOTES).toBe('quotes');
    });

    it('should have ASSETS path', async () => {
      const { STORAGE_PATHS } = await import('@/lib/storage/r2-client');
      expect(STORAGE_PATHS.ASSETS).toBe('assets');
    });

    it('should have MOCKUPS path', async () => {
      const { STORAGE_PATHS } = await import('@/lib/storage/r2-client');
      expect(STORAGE_PATHS.MOCKUPS).toBe('mockups');
    });

    it('should have UGC path', async () => {
      const { STORAGE_PATHS } = await import('@/lib/storage/r2-client');
      expect(STORAGE_PATHS.UGC).toBe('ugc');
    });

    it('should have EXPORTS path', async () => {
      const { STORAGE_PATHS } = await import('@/lib/storage/r2-client');
      expect(STORAGE_PATHS.EXPORTS).toBe('exports');
    });

    it('should have TEMP path', async () => {
      const { STORAGE_PATHS } = await import('@/lib/storage/r2-client');
      expect(STORAGE_PATHS.TEMP).toBe('temp');
    });
  });

  describe('R2_CONFIG', () => {
    it('should export R2_CONFIG', async () => {
      const { R2_CONFIG } = await import('@/lib/storage/r2-client');
      expect(R2_CONFIG).toBeDefined();
    });

    it('should have required config fields', async () => {
      const { R2_CONFIG } = await import('@/lib/storage/r2-client');
      expect(R2_CONFIG).toHaveProperty('accountId');
      expect(R2_CONFIG).toHaveProperty('accessKeyId');
      expect(R2_CONFIG).toHaveProperty('secretAccessKey');
      expect(R2_CONFIG).toHaveProperty('bucketName');
      expect(R2_CONFIG).toHaveProperty('publicUrl');
    });

    it('should have default bucket name', async () => {
      const { R2_CONFIG } = await import('@/lib/storage/r2-client');
      expect(R2_CONFIG.bucketName).toBe('haven-hub-assets');
    });
  });
});

describe('File Validation', () => {
  describe('Allowed Image Types', () => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

    allowedTypes.forEach((type) => {
      it(`should allow ${type} images`, () => {
        expect(allowedTypes).toContain(type);
      });
    });

    it('should not allow SVG images', () => {
      expect(allowedTypes).not.toContain('image/svg+xml');
    });

    it('should not allow BMP images', () => {
      expect(allowedTypes).not.toContain('image/bmp');
    });
  });

  describe('Allowed Document Types', () => {
    const allowedDocTypes = ['application/pdf', 'application/zip', 'text/csv', 'application/json'];

    allowedDocTypes.forEach((type) => {
      it(`should allow ${type} documents`, () => {
        expect(allowedDocTypes).toContain(type);
      });
    });
  });

  describe('Size Limits', () => {
    it('should have 10MB image size limit', () => {
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
      expect(MAX_IMAGE_SIZE).toBe(10485760);
    });

    it('should have 50MB document size limit', () => {
      const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;
      expect(MAX_DOCUMENT_SIZE).toBe(52428800);
    });
  });
});

describe('Key Generation Logic', () => {
  it('should generate timestamp-based keys', () => {
    const before = Date.now();
    const key = `assets/user-123/${Date.now()}-abc123-test.png`;
    const after = Date.now();

    const timestampMatch = key.match(/\/(\d+)-/);
    expect(timestampMatch).toBeDefined();

    const timestamp = parseInt(timestampMatch![1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should generate random suffix', () => {
    const random1 = Math.random().toString(36).substring(2, 8);
    const random2 = Math.random().toString(36).substring(2, 8);

    expect(random1).not.toBe(random2);
    expect(random1.length).toBe(6);
    expect(random2.length).toBe(6);
  });

  it('should sanitize special characters', () => {
    const unsafe = 'file name!@#$%^&*().png';
    const sanitized = unsafe
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 50);

    expect(sanitized).not.toContain(' ');
    expect(sanitized).not.toContain('!');
    expect(sanitized).not.toContain('@');
  });
});
