import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const imageExtByMime: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

class UploadService {
  private getS3Client(): S3Client {
    if (!env.awsRegion || !env.awsAccessKeyId || !env.awsSecretAccessKey || !env.awsS3BucketName) {
      throw new AppError('S3 is not configured. Set AWS env variables before uploading.', 500);
    }

    return new S3Client({
      region: env.awsRegion,
      credentials: {
        accessKeyId: env.awsAccessKeyId,
        secretAccessKey: env.awsSecretAccessKey,
      },
    });
  }

  private getPublicUrl(key: string): string {
    if (env.awsS3PublicBaseUrl) {
      return `${env.awsS3PublicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    return `https://${env.awsS3BucketName}.s3.${env.awsRegion}.amazonaws.com/${key}`;
  }

  async uploadDoctorAvatar(file: Express.Multer.File): Promise<string> {
    const ext = imageExtByMime[file.mimetype] || 'bin';
    const folderPrefix = env.awsS3Folder.replace(/^\/+|\/+$/g, '');
    const basePath = folderPrefix ? `${folderPrefix}/doctors/avatars` : 'doctors/avatars';
    const key = `${basePath}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const client = this.getS3Client();

    await client.send(
      new PutObjectCommand({
        Bucket: env.awsS3BucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000',
      })
    );

    return this.getPublicUrl(key);
  }
}

export const uploadService = new UploadService();
