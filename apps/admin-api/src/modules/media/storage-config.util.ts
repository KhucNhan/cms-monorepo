// apps/admin-api/src/modules/media/storage-config.util.ts

export interface StorageConfig {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
  publicUrl: string;
}

/**
 * Không set STORAGE_PROVIDER (hoặc set = 'minio') -> dùng MinIO local.
 * Set STORAGE_PROVIDER=s3 hoặc =r2 -> dùng biến STORAGE_* (production).
 */
export function resolveStorageConfig(): StorageConfig {
  const provider = process.env['STORAGE_PROVIDER'];
  const usesRemote = !!provider && provider !== 'minio';

  if (usesRemote) {
    return {
      endpoint: process.env['STORAGE_ENDPOINT'] || undefined,
      region: process.env['STORAGE_REGION']!,
      accessKeyId: process.env['STORAGE_ACCESS_KEY']!,
      secretAccessKey: process.env['STORAGE_SECRET_KEY']!,
      bucket: process.env['STORAGE_BUCKET']!,
      forcePathStyle: process.env['STORAGE_FORCE_PATH_STYLE'] === 'true',
      publicUrl: (process.env['STORAGE_PUBLIC_URL'] ?? '').replace(/\/+$/, ''),
    };
  }

  return {
    endpoint: process.env['MINIO_ENDPOINT'] ?? 'http://localhost:9000',
    region: 'us-east-1',
    accessKeyId: process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
    secretAccessKey: process.env['MINIO_SECRET_KEY'] ?? 'minioadmin123',
    bucket: process.env['MINIO_BUCKET'] ?? 'cms-media',
    forcePathStyle: true,
    publicUrl: (process.env['MINIO_PUBLIC_URL'] ?? 'http://localhost:9000/cms-media').replace(/\/+$/, ''),
  };
}