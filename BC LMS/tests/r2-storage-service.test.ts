import { describe, it, expect } from 'vitest';
import { validateFileInput, buildR2Key, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/services/r2-storage-service';

describe('R2 Storage Service', () => {
  describe('validateFileInput', () => {
    it('should accept valid PDF', () => {
      expect(validateFileInput('doc.pdf', 'application/pdf', 1024)).toBeNull();
    });

    it('should accept valid PNG image', () => {
      expect(validateFileInput('photo.png', 'image/png', 2048)).toBeNull();
    });

    it('should accept valid JPEG image', () => {
      expect(validateFileInput('photo.jpg', 'image/jpeg', 2048)).toBeNull();
    });

    it('should accept valid GIF image', () => {
      expect(validateFileInput('animation.gif', 'image/gif', 3072)).toBeNull();
    });

    it('should accept valid WebP image', () => {
      expect(validateFileInput('modern.webp', 'image/webp', 1500)).toBeNull();
    });

    it('should accept valid MP3 audio', () => {
      expect(validateFileInput('audio.mp3', 'audio/mpeg', 5000)).toBeNull();
    });

    it('should accept valid WAV audio', () => {
      expect(validateFileInput('sound.wav', 'audio/wav', 4000)).toBeNull();
    });

    it('should accept valid OGG audio', () => {
      expect(validateFileInput('track.ogg', 'audio/ogg', 3500)).toBeNull();
    });

    it('should reject .exe files', () => {
      const result = validateFileInput('malware.exe', 'application/x-msdownload', 1024);
      expect(result).not.toBeNull();
      expect(result).toContain('không được hỗ trợ');
    });

    it('should reject video files (MP4)', () => {
      const result = validateFileInput('video.mp4', 'video/mp4', 1024);
      expect(result).not.toBeNull();
      expect(result).toContain('không được hỗ trợ');
    });

    it('should reject video files (WebM)', () => {
      const result = validateFileInput('video.webm', 'video/webm', 1024);
      expect(result).not.toBeNull();
    });

    it('should reject files over 100MB', () => {
      const result = validateFileInput('huge.pdf', 'application/pdf', MAX_FILE_SIZE + 1);
      expect(result).not.toBeNull();
      expect(result).toContain('quá lớn');
    });

    it('should reject files at exactly MAX_FILE_SIZE + 1 byte', () => {
      const result = validateFileInput('large.pdf', 'application/pdf', MAX_FILE_SIZE + 1);
      expect(result).not.toBeNull();
    });

    it('should accept files at exactly MAX_FILE_SIZE', () => {
      const result = validateFileInput('max.pdf', 'application/pdf', MAX_FILE_SIZE);
      expect(result).toBeNull();
    });

    it('should reject empty filename', () => {
      const result = validateFileInput('', 'application/pdf', 1024);
      expect(result).not.toBeNull();
    });

    it('should reject whitespace-only filename', () => {
      const result = validateFileInput('   ', 'application/pdf', 1024);
      expect(result).not.toBeNull();
    });

    it('should reject zero-size file', () => {
      const result = validateFileInput('empty.pdf', 'application/pdf', 0);
      expect(result).not.toBeNull();
    });

    it('should reject negative size', () => {
      const result = validateFileInput('bad.pdf', 'application/pdf', -100);
      expect(result).not.toBeNull();
    });

    it('should include MIME type in error message', () => {
      const result = validateFileInput('script.js', 'application/javascript', 512);
      expect(result).toContain('application/javascript');
    });

    it('should include file size in error message for oversized files', () => {
      const oversizeBytes = MAX_FILE_SIZE + 50 * 1024 * 1024; // 50MB over limit
      const result = validateFileInput('huge.pdf', 'application/pdf', oversizeBytes);
      expect(result).toContain('50MB');
    });
  });

  describe('buildR2Key', () => {
    it('should build key with correct base format', () => {
      const key = buildR2Key('course1', 'lesson1', 'test.pdf');
      expect(key).toMatch(/^materials\/course1\/lesson1\/\d+-test\.pdf$/);
    });

    it('should include timestamp in key', () => {
      const before = Date.now();
      const key = buildR2Key('c1', 'l1', 'file.pdf');
      const after = Date.now();

      const match = key.match(/\/(\d+)-/);
      expect(match).not.toBeNull();
      if (match) {
        const timestamp = parseInt(match[1]);
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
      }
    });

    it('should sanitize special characters in filename', () => {
      const key = buildR2Key('c1', 'l1', 'file name (1) & special.pdf');
      expect(key).not.toContain(' ');
      expect(key).not.toContain('(');
      expect(key).not.toContain(')');
      expect(key).not.toContain('&');
    });

    it('should lowercase filename', () => {
      const key = buildR2Key('c1', 'l1', 'MyFile.PDF');
      expect(key).toContain('myfile.pdf');
      expect(key).not.toContain('MyFile');
      expect(key).not.toContain('.PDF');
    });

    it('should collapse multiple spaces into single underscore', () => {
      const key = buildR2Key('c1', 'l1', 'a   b.pdf');
      expect(key).not.toContain('___');
      expect(key).toContain('a_b.pdf');
    });

    it('should preserve hyphens in filename', () => {
      const key = buildR2Key('c1', 'l1', 'my-file-name.pdf');
      expect(key).toContain('my-file-name.pdf');
    });

    it('should preserve dots in filename', () => {
      const key = buildR2Key('c1', 'l1', 'file.backup.pdf');
      expect(key).toContain('file.backup.pdf');
    });

    it('should handle complex filenames', () => {
      const key = buildR2Key('course-001', 'lesson-02', 'Lesson Plan (Draft) v2.1.pdf');
      expect(key).toMatch(/^materials\/course-001\/lesson-02\/\d+-lesson_plan_draft_v2\.1\.pdf$/);
    });

    it('should build different keys for same file at different times', async () => {
      const key1 = buildR2Key('c1', 'l1', 'file.pdf');
      await new Promise(resolve => setTimeout(resolve, 10));
      const key2 = buildR2Key('c1', 'l1', 'file.pdf');
      expect(key1).not.toBe(key2); // Different timestamps
    });
  });

  describe('ALLOWED_MIME_TYPES', () => {
    it('should include PDF', () => {
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
    });

    it('should include PNG', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
    });

    it('should include JPEG', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    });

    it('should include GIF', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/gif');
    });

    it('should include WebP', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/webp');
    });

    it('should include MP3', () => {
      expect(ALLOWED_MIME_TYPES).toContain('audio/mpeg');
    });

    it('should include WAV', () => {
      expect(ALLOWED_MIME_TYPES).toContain('audio/wav');
    });

    it('should include OGG', () => {
      expect(ALLOWED_MIME_TYPES).toContain('audio/ogg');
    });

    it('should NOT include video types', () => {
      expect(ALLOWED_MIME_TYPES).not.toContain('video/mp4');
      expect(ALLOWED_MIME_TYPES).not.toContain('video/webm');
      expect(ALLOWED_MIME_TYPES).not.toContain('video/quicktime');
    });

    it('should NOT include executable types', () => {
      expect(ALLOWED_MIME_TYPES).not.toContain('application/x-msdownload');
      expect(ALLOWED_MIME_TYPES).not.toContain('application/x-executable');
    });

    it('should NOT include Word document types', () => {
      expect(ALLOWED_MIME_TYPES).not.toContain('application/msword');
      expect(ALLOWED_MIME_TYPES).not.toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should NOT include Excel types', () => {
      expect(ALLOWED_MIME_TYPES).not.toContain('application/vnd.ms-excel');
      expect(ALLOWED_MIME_TYPES).not.toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should be an array', () => {
      expect(Array.isArray(ALLOWED_MIME_TYPES)).toBe(true);
    });

    it('should have reasonable length (8-15 types)', () => {
      expect(ALLOWED_MIME_TYPES.length).toBeGreaterThanOrEqual(8);
      expect(ALLOWED_MIME_TYPES.length).toBeLessThanOrEqual(15);
    });
  });

  describe('MAX_FILE_SIZE constant', () => {
    it('should be defined', () => {
      expect(MAX_FILE_SIZE).toBeDefined();
    });

    it('should be 100MB (104857600 bytes)', () => {
      expect(MAX_FILE_SIZE).toBe(100 * 1024 * 1024);
    });

    it('should be greater than 50MB', () => {
      expect(MAX_FILE_SIZE).toBeGreaterThan(50 * 1024 * 1024);
    });

    it('should be a positive number', () => {
      expect(MAX_FILE_SIZE).toBeGreaterThan(0);
    });
  });
});
