// apps/admin-api/src/modules/media/storage.service.ts

import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { resolveStorageConfig } from './storage-config.util';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const config = resolveStorageConfig();
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
  }

  /** Sinh URL public cho 1 object key — thay thế hoàn toàn buildUrl() cũ (local /uploads/...). */
  buildUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return this.buildUrl(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** S3/MinIO không có "rename" thật — copy sang key mới rồi xoá key cũ. */
  async rename(oldKey: string, newKey: string): Promise<string> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${encodeURIComponent(oldKey)}`,
        Key: newKey,
      }),
    );
    await this.delete(oldKey);
    return this.buildUrl(newKey);
  }
}