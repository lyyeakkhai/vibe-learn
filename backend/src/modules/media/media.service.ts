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
              new BadRequestException(
                error?.message || 'Cloudinary upload failed',
              ),
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
