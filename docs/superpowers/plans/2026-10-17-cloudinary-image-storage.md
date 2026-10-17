# Cloudinary Image Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Cloudinary image storage into Vibelearn, enabling authenticated admins to upload course cover images and instructor avatars with drag-and-drop and instant previews while keeping Cloudinary credentials strictly secure on the server.

**Architecture:** A NestJS `MediaModule` exposes a `POST /api/media/upload` endpoint protected by `ClerkAuthGuard`. Image files are received into memory buffers via Multer and streamed directly to Cloudinary using `cloudinary.v2.uploader.upload_stream`. In the frontend, a reusable `ImageUploader` component is integrated into `CourseFormModal` for both cover images and instructor avatars, with drag-and-drop, validation, preview, and an optional manual URL fallback.

**Tech Stack:** React (Vite), NestJS, Cloudinary SDK (`cloudinary`), Multer, Clerk Auth, Tailwind CSS, Lucide React.

## Global Constraints

- Never expose `CLOUDINARY_API_KEY` or `CLOUDINARY_API_SECRET` to frontend code or `VITE_` variables.
- Keep media endpoints protected behind `ClerkAuthGuard`.
- All uploads must use memory buffers with no temporary files saved to disk.
- Max file size limit is 5MB; supported types: JPEG, PNG, WebP, GIF, SVG.
- Follow design system semantic tokens (`border-border`, `bg-card`, `text-foreground`, `focus:ring-primary-500`) without arbitrary hex colors.
- Maintain documentation integrity and preserve existing codebase comments.

---

### Task 1: Install Backend Dependencies & Configure Environment

**Files:**
- Modify: `backend/package.json`
- Modify: `.env.example`
- Modify: `.env`

**Interfaces:**
- Consumes: `pnpm add cloudinary` and `pnpm add -D @types/multer` in `backend/`
- Produces: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in environment

- [ ] **Step 1: Install `cloudinary` and `@types/multer` in backend**

```bash
pnpm --filter vibelearn-backend add cloudinary
pnpm --filter vibelearn-backend add -D @types/multer
```

- [ ] **Step 2: Update `.env.example` with Cloudinary environment variables**

Add the following to `.env.example`:
```bash
# --- Cloudinary Media Storage ---
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- [ ] **Step 3: Ensure local `.env` has fallback / placeholder Cloudinary keys**

Ensure `.env` contains:
```bash
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=sample_key
CLOUDINARY_API_SECRET=sample_secret
```

- [ ] **Step 4: Commit**

```bash
git add backend/package.json pnpm-lock.yaml .env.example
git commit -m "chore(backend): add cloudinary dependency and env config"
```

---

### Task 2: Implement CloudinaryProvider and MediaService with Unit Test

**Files:**
- Create: `backend/src/modules/media/dto/upload-image-response.dto.ts`
- Create: `backend/src/modules/media/cloudinary.provider.ts`
- Create: `backend/src/modules/media/media.service.ts`
- Create: `backend/src/modules/media/media.service.spec.ts`

**Interfaces:**
- Consumes: `ConfigService` from `@nestjs/config`, `cloudinary.v2`
- Produces: `MediaService.uploadImage(file: Express.Multer.File, folder?: string): Promise<UploadImageResponseDto>`

- [ ] **Step 1: Write the failing unit test for `MediaService`**

Create `backend/src/modules/media/media.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { v2 as cloudinary } from 'cloudinary';

jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload_stream: jest.fn(),
    },
  },
}));

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: 'CLOUDINARY',
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException if no file is provided', async () => {
    await expect(service.uploadImage(null as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should stream upload file buffer and return upload response', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('fake-image-content'),
      size: 18,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockCloudinaryResult = {
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.png',
      public_id: 'vibelearn/courses/sample',
      width: 800,
      height: 600,
      format: 'png',
    };

    const mockEnd = jest.fn();
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (options, callback) => {
        callback(null, mockCloudinaryResult);
        return { end: mockEnd };
      },
    );

    const result = await service.uploadImage(mockFile, 'vibelearn/courses');

    expect(result).toEqual({
      success: true,
      url: mockCloudinaryResult.secure_url,
      publicId: mockCloudinaryResult.public_id,
      width: 800,
      height: 600,
      format: 'png',
    });
    expect(mockEnd).toHaveBeenCalledWith(mockFile.buffer);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter vibelearn-backend test media.service.spec.ts`
Expected: FAIL (Cannot find module `./media.service`)

- [ ] **Step 3: Implement `upload-image-response.dto.ts`, `cloudinary.provider.ts`, and `media.service.ts`**

Create `backend/src/modules/media/dto/upload-image-response.dto.ts`:
```typescript
export class UploadImageResponseDto {
  success: boolean;
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}
```

Create `backend/src/modules/media/cloudinary.provider.ts`:
```typescript
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CLOUDINARY = 'CLOUDINARY';

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return cloudinary.config({
      cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  },
};
```

Create `backend/src/modules/media/media.service.ts`:
```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadImageResponseDto } from './dto/upload-image-response.dto';

@Injectable()
export class MediaService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'vibelearn/courses',
  ): Promise<UploadImageResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided for upload');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new BadRequestException(error?.message || 'Cloudinary upload failed'),
            );
          }
          resolve({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter vibelearn-backend test media.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/media/
git commit -m "feat(backend): implement CloudinaryProvider and MediaService with unit tests"
```

---

### Task 3: Implement MediaController and Register MediaModule

**Files:**
- Create: `backend/src/modules/media/media.controller.ts`
- Create: `backend/src/modules/media/media.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `MediaService`, `ClerkAuthGuard`, `FileInterceptor`
- Produces: `POST /api/media/upload` HTTP endpoint

- [ ] **Step 1: Implement `media.controller.ts`**

Create `backend/src/modules/media/media.controller.ts`:
```typescript
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { UploadImageResponseDto } from './dto/upload-image-response.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, SVG',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const targetFolder =
      folder === 'instructors' ? 'vibelearn/instructors' : 'vibelearn/courses';
    return this.mediaService.uploadImage(file, targetFolder);
  }
}
```

- [ ] **Step 2: Implement `media.module.ts` and register in `app.module.ts`**

Create `backend/src/modules/media/media.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { CloudinaryProvider } from './cloudinary.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [MediaController],
  providers: [MediaService, CloudinaryProvider],
  exports: [MediaService],
})
export class MediaModule {}
```

In `backend/src/app.module.ts`:
- Import `MediaModule` from `./modules/media/media.module`
- Add `MediaModule` to `imports` array

- [ ] **Step 3: Run backend build and lint**

Run:
```bash
pnpm --filter vibelearn-backend run lint
pnpm --filter vibelearn-backend run build
```
Expected: PASS with zero errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/media/media.controller.ts backend/src/modules/media/media.module.ts backend/src/app.module.ts
git commit -m "feat(backend): add MediaController with upload endpoint and register MediaModule"
```

---

### Task 4: Implement Frontend MediaService

**Files:**
- Create: `frontend/src/services/media-service.ts`

**Interfaces:**
- Consumes: `fetch`, `import.meta.env.VITE_API_URL`
- Produces: `MediaService.uploadImage(file: File, folder?: 'courses' | 'instructors', token?: string | null): Promise<UploadImageResponse>`

- [ ] **Step 1: Implement `frontend/src/services/media-service.ts`**

Create `frontend/src/services/media-service.ts`:
```typescript
export interface UploadImageResponse {
  success: boolean;
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

export const MediaService = {
  /**
   * Upload an image to Cloudinary via the backend API
   */
  async uploadImage(
    file: File,
    folder: 'courses' | 'instructors' = 'courses',
    token?: string | null,
  ): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(
      `${apiUrl}/media/upload?folder=${encodeURIComponent(folder)}`,
      {
        method: 'POST',
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload image');
    }

    return response.json();
  },
};
```

- [ ] **Step 2: Run frontend lint check**

Run: `pnpm --filter vibelearn-frontend run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/media-service.ts
git commit -m "feat(frontend): create MediaService for Cloudinary uploads"
```

---

### Task 5: Implement Reusable ImageUploader Component

**Files:**
- Create: `frontend/src/components/common/image-uploader.tsx`

**Interfaces:**
- Consumes: `MediaService`, `lucide-react`, design tokens
- Produces: `<ImageUploader />` React component

- [ ] **Step 1: Implement `frontend/src/components/common/image-uploader.tsx`**

Create `frontend/src/components/common/image-uploader.tsx`:
```tsx
import React, { useState, useRef } from "react"
import { UploadCloud, X, Loader2, Image as ImageIcon, Link as LinkIcon, AlertCircle } from "lucide-react"
import { MediaService } from "@/services/media-service"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  label: string
  description?: string
  value?: string
  onChange: (url: string) => void
  folder?: "courses" | "instructors"
  aspectRatio?: "video" | "square"
  token?: string | null
  presets?: Array<{ label: string; value: string }>
  onUploadStateChange?: (uploading: boolean) => void
}

export function ImageUploader({
  label,
  description,
  value,
  onChange,
  folder = "courses",
  aspectRatio = "video",
  token,
  presets = [],
  onUploadStateChange,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrlFallback, setShowUrlFallback] = useState(false)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // 5MB client-side limit
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file")
      return
    }

    setError(null)
    setUploading(true)
    onUploadStateChange?.(true)

    try {
      const response = await MediaService.uploadImage(file, folder, token)
      onChange(response.url)
    } catch (err: any) {
      setError(err?.message || "Upload failed. Please check credentials or try again.")
    } finally {
      setUploading(false)
      onUploadStateChange?.(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <button
          type="button"
          onClick={() => setShowUrlFallback(!showUrlFallback)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-600 transition-colors"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showUrlFallback ? "Hide URL / Presets" : "Enter URL or Presets"}</span>
        </button>
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0])
          }
        }}
      />

      {/* Value preview or Upload dropzone */}
      {value ? (
        <div className="relative rounded-lg border border-border bg-card p-2 flex items-center gap-4">
          <div
            className={cn(
              "overflow-hidden rounded-md border border-border bg-neutral-100 dark:bg-neutral-800 shrink-0",
              aspectRatio === "video" ? "h-20 w-32" : "h-16 w-16 rounded-full"
            )}
          >
            <img
              src={value}
              alt={label}
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = "none"
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-muted-foreground truncate">{value}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                Change Image
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
              >
                <X className="h-3.5 w-3.5 inline mr-1" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20"
              : "border-border hover:border-primary-500/50 bg-neutral-50/50 dark:bg-neutral-900/30",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              <p className="text-xs font-medium text-foreground">Uploading to Cloudinary...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-full bg-primary-50 p-2 text-primary-600 dark:bg-primary-950/50">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-foreground">
                <span className="text-primary-600 hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP or SVG up to 5MB</p>
            </div>
          )}
        </div>
      )}

      {/* Error feedback */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fallback URL Input & Presets */}
      {showUrlFallback && (
        <div className="mt-3 space-y-2 rounded-md border border-border/80 bg-neutral-50/50 dark:bg-neutral-900/20 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://res.cloudinary.com/... or image URL"
              className="h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onChange(preset.value)}
                  className={cn(
                    "rounded border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    value === preset.value
                      ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                      : "border-border bg-background text-neutral-600 hover:text-primary-600 dark:text-neutral-400"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run frontend lint check**

Run: `pnpm --filter vibelearn-frontend run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/common/image-uploader.tsx
git commit -m "feat(frontend): create reusable ImageUploader component"
```

---

### Task 6: Wire ImageUploader into CourseFormModal

**Files:**
- Modify: `frontend/src/components/admin/course-form-modal.tsx`

**Interfaces:**
- Consumes: `ImageUploader`, `useAuth` from Clerk
- Produces: Integrated image upload and preview for both Course Cover and Instructor Avatar in `CourseFormModal`

- [ ] **Step 1: Update `frontend/src/components/admin/course-form-modal.tsx`**

In `CourseFormInner`:
1. Import `useAuth` from `@clerk/clerk-react`.
2. Retrieve `const { getToken } = useAuth();` and maintain state `token` in an effect or callback.
3. Add state `const [isUploadingImage, setIsUploadingImage] = useState(false);`.
4. Replace the Cover Image input block with `<ImageUploader label="Cover Image" ... presets={PRESET_IMAGES} />`.
5. Replace the Instructor Avatar input with `<ImageUploader label="Instructor Avatar" aspectRatio="square" ... />`.
6. Disable the save button when `saving || isUploadingImage`.

- [ ] **Step 2: Run frontend build and lint**

Run:
```bash
pnpm --filter vibelearn-frontend run lint
pnpm --filter vibelearn-frontend run build
```
Expected: PASS with zero errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/course-form-modal.tsx
git commit -m "feat(frontend): integrate ImageUploader into CourseFormModal"
```

---

### Task 7: Verification, Roadmap Update & Project Checks

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Run comprehensive lint and build checks**

```bash
pnpm --filter vibelearn-backend run lint
pnpm --filter vibelearn-backend run build
pnpm --filter vibelearn-frontend run lint
pnpm --filter vibelearn-frontend run build
```
Expected: All checks pass cleanly.

- [ ] **Step 2: Update `docs/roadmap.md`**

Add task 4.7 under Phase 4:
```markdown
- [x] 4.7: Integrate Cloudinary image storage for course cover images and instructor avatars in course management (`MediaModule`, `POST /api/media/upload`, and `ImageUploader` component).
```

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs(roadmap): mark task 4.7 cloudinary image storage as completed"
```
