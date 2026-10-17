# Vibelearn Cloudinary Image Storage Design Spec

- **Author:** Principal Full-Stack Engineer / AI Implementation Agent
- **Date:** 2026-10-17
- **Status:** Approved
- **Scope:** Course Cover Images & Instructor Avatars in Course Management

---

## 1. Executive Summary & Goals

Vibelearn is an online learning platform with a rich catalog of courses. Currently, course cover images in the admin modal (`CourseFormModal`) rely on manual URL strings or preset static asset paths (`/src/assets/courses/*`).

As the platform scales to accommodate real-world courses with high image volume, Vibelearn requires automated cloud image hosting. This specification defines the architecture, API contracts, security controls, and UI components needed to integrate **Cloudinary** for image storage and delivery.

### Key Goals
1. Provide a secure, server-side authenticated image upload endpoint (`POST /api/media/upload`) powered by the NestJS backend.
2. Stream files in-memory directly to Cloudinary without writing temporary files to local disk.
3. Keep Cloudinary API secrets strictly on the backend, secured behind Clerk JWT authentication (`ClerkAuthGuard`).
4. Implement a responsive, accessible, drag-and-drop `ImageUploader` component in the frontend using the Vibelearn design system tokens.
5. Support both Cloudinary file uploads and an optional manual URL / preset toggle for backward compatibility.

---

## 2. Architecture & System Boundaries

```
┌────────────────────────────────────────────────────────┐
│                   Vite React Frontend                   │
│                                                        │
│  ┌───────────────────────┐   ┌───────────────────────┐  │
│  │   CourseFormModal     │   │   ImageUploader UI    │  │
│  │   (Admin Page)        │──▶│   (Drag & Drop / Pick)│  │
│  └───────────────────────┘   └───────────┬───────────┘  │
│                                          │             │
│                              FormData    │ Auth: Bearer│
│                              (Multipart) │ (Clerk JWT) │
└──────────────────────────────────────────┼─────────────┘
                                           ▼
┌────────────────────────────────────────────────────────┐
│                  NestJS Express API                    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ POST /api/media/upload (ClerkAuthGuard)          │  │
│  │ FileInterceptor (Multer MemoryStorage)           │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│                             ▼ (Memory Buffer Stream)   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ MediaService -> CloudinaryProvider               │  │
│  │ (cloudinary.v2.uploader.upload_stream)           │  │
│  └──────────────────────────┬───────────────────────┘  │
└─────────────────────────────┼──────────────────────────┘
                              │ HTTPS
                              ▼
┌────────────────────────────────────────────────────────┐
│                   Cloudinary CDN                       │
│      Folder: vibelearn/courses | vibelearn/instructors  │
│      Returns: { secure_url, public_id, ... }           │
└────────────────────────────────────────────────────────┘
```

### Architectural Principles
- **Strict Server Secret Boundary:** `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are never exposed to the frontend or included in client builds. Only the NestJS backend communicates with the Cloudinary REST API.
- **Stateless Streaming:** Files are received into Node.js memory buffers via Multer and piped directly into Cloudinary's `upload_stream`. No disk I/O or temporary file cleanup is required.
- **Authentication:** All media upload endpoints require a valid Clerk user session verified by `ClerkAuthGuard`.
- **Organized Storage:** Uploaded assets are tagged and organized into folder namespaces:
  - `vibelearn/courses` for course covers.
  - `vibelearn/instructors` for instructor avatars.

---

## 3. Backend Specification (`backend/src/modules/media/`)

### 3.1 Dependencies
- `cloudinary` (v2 Node.js SDK) installed in `backend/package.json`.
- `@types/multer` installed in `backend/package.json` devDependencies.

### 3.2 Environment Variables
The following environment variables are added to `.env` and `.env.example`:
```bash
# --- Cloudinary Media Storage ---
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3.3 File Organization
```
backend/src/modules/media/
├── cloudinary.provider.ts            # Cloudinary SDK provider token
├── media.controller.ts               # POST /api/media/upload endpoint
├── media.service.ts                  # In-memory buffer upload stream service
├── media.module.ts                   # NestJS Module export
├── dto/
│   └── upload-image-response.dto.ts  # Typed response payload
└── media.service.spec.ts             # Unit tests for upload logic
```

### 3.4 Provider: `CloudinaryProvider`
Injects `ConfigService` to initialize Cloudinary v2 SDK:
```typescript
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
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

### 3.5 Service: `MediaService`
```typescript
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
            return reject(new BadRequestException(error?.message || 'Cloudinary upload failed'));
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

### 3.6 Controller: `MediaController`
```typescript
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'image/svg+xml',
        ];
        if (!allowedTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only image files (JPEG, PNG, WebP, GIF, SVG) are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<UploadImageResponseDto> {
    const targetFolder =
      folder === 'instructors' ? 'vibelearn/instructors' : 'vibelearn/courses';
    return this.mediaService.uploadImage(file, targetFolder);
  }
}
```

---

## 4. Frontend Specification (`frontend/src/`)

### 4.1 Service: `MediaService` (`frontend/src/services/media-service.ts`)
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
    const response = await fetch(`${apiUrl}/media/upload?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload image');
    }

    return response.json();
  },
};
```

### 4.2 Component: `ImageUploader` (`frontend/src/components/common/image-uploader.tsx`)
A modular UI component featuring:
- **Dropzone Area:** Accepts dragged files or click-to-browse.
- **Client Validation:** Rejects files $> 5\text{MB}$ or unsupported MIME types immediately with an inline alert.
- **State Feedback:**
  - `isUploading`: Spinner overlay (`Loader2` spin), descriptive text, disabling modal submission.
  - `hasValue`: Image preview container with `aspect-video` (for courses) or `aspect-square` (for instructor avatars), "Replace Image" and "Remove Image" actions.
  - `hasError`: Inline red alert with retry action.
- **URL / Preset Fallback Toggle:** An expandable `"Or use image URL / preset"` panel allowing direct URL input and preset image buttons.

### 4.3 Integration in `CourseFormModal`
- In `CourseFormModal`:
  1. Replace the plain text URL input in the **Cover Image** section with:
     ```tsx
     <ImageUploader
       label="Course Cover Image"
       description="16:9 recommended, PNG, JPG, or WebP up to 5MB"
       aspectRatio="video"
       value={form.cover_image_url || ""}
       onChange={(url) => setForm((prev) => ({ ...prev, cover_image_url: url }))}
       folder="courses"
       token={token}
       onUploadStateChange={setIsUploadingImage}
     />
     ```
  2. Enhance the **Instructor Avatar** field with:
     ```tsx
     <ImageUploader
       label="Instructor Avatar"
       description="Square 1:1 ratio recommended"
       aspectRatio="square"
       value={form.instructor_avatar || ""}
       onChange={(url) => setForm((prev) => ({ ...prev, instructor_avatar: url }))}
       folder="instructors"
       token={token}
       onUploadStateChange={setIsUploadingImage}
     />
     ```
  3. Ensure the modal save button is disabled when `isUploadingImage` is true to prevent incomplete submissions.

---

## 5. Security & Error Handling

1. **Authentication:** Only authenticated users bearing a valid Clerk JWT can access `POST /api/media/upload`. Anonymous requests fail with `401 Unauthorized`.
2. **Payload Inspection:** File validation occurs both client-side (pre-flight) and server-side (Multer `fileFilter` and size limits).
3. **Secret Protection:** No Cloudinary API secrets are exposed to client code or environment variables prefixed with `VITE_`.
4. **Service Failures:** If Cloudinary encounters connection or credential errors, the server returns a clean `500` / `400` message without leaking raw stack traces or internal keys.

---

## 6. Verification & Acceptance Criteria

1. **Backend Verification:**
   - Unit tests for `MediaService` passing with mocked Cloudinary responses.
   - `pnpm --filter vibelearn-backend run lint` passes without errors.
   - `pnpm --filter vibelearn-backend run build` succeeds.
2. **Frontend Verification:**
   - `pnpm --filter vibelearn-frontend run lint` passes without errors.
   - `pnpm --filter vibelearn-frontend run build` succeeds.
3. **End-to-End Workflow:**
   - An authenticated admin navigates to `/admin/courses`.
   - Admin opens "Create Course", drops an image file onto the cover image uploader.
   - Cloudinary returns the secure URL and renders the preview.
   - Admin saves the course. The course appears in the course list with the Cloudinary cover image.
   - Admin edits the course, updates the instructor avatar with a new upload, and saves successfully.
   - Fallback URL input and presets remain functional when toggled.
