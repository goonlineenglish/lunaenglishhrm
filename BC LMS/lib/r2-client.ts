// R2 S3-compatible client singleton — prevents multiple instances in dev hot-reload

import { S3Client } from '@aws-sdk/client-s3';

const globalForR2 = globalThis as unknown as {
  r2Client: S3Client | undefined;
};

function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export const r2Client = globalForR2.r2Client ?? createR2Client();

if (process.env.NODE_ENV !== 'production') globalForR2.r2Client = r2Client;
