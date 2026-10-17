import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

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
    await expect(
      service.uploadImage(null as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  it('should stream upload file buffer and return upload response', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('fake-image-content'),
      size: 18,
      stream: null as unknown as Readable,
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
      (
        _options: unknown,
        callback: (err: null, result: typeof mockCloudinaryResult) => void,
      ) => {
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
