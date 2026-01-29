// Blob storage abstraction layer
// Uses Vercel Blob in production, local filesystem in development

import { prisma } from './prisma';
import { logger } from './logger';

export interface BlobUploadResult {
  success: boolean;
  url?: string;
  pathname?: string;
  size?: number;
  error?: string;
}

export interface BlobDeleteResult {
  success: boolean;
  error?: string;
}

// Check if we're in a Vercel environment with Blob configured
const isVercelBlobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Upload a file to blob storage
 * Uses Vercel Blob in production, local filesystem in development
 */
export async function uploadBlob(
  data: Uint8Array | Buffer,
  pathname: string,
  options?: {
    contentType?: string;
    clienteId?: string;
    type?: string;
  }
): Promise<BlobUploadResult> {
  try {
    if (isVercelBlobConfigured) {
      return await uploadToVercelBlob(data, pathname, options);
    } else {
      return await uploadToLocalFilesystem(data, pathname, options);
    }
  } catch (error) {
    logger.error('Blob upload error', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error uploading file'
    };
  }
}

/**
 * Delete a file from blob storage
 */
export async function deleteBlob(url: string): Promise<BlobDeleteResult> {
  try {
    if (isVercelBlobConfigured) {
      return await deleteFromVercelBlob(url);
    } else {
      return await deleteFromLocalFilesystem(url);
    }
  } catch (error) {
    logger.error('Blob delete error', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error deleting file'
    };
  }
}

/**
 * Get blob URL for serving
 * In local dev, returns path relative to public folder
 * In Vercel, returns the full Blob URL
 */
export function getBlobUrl(pathname: string): string {
  if (isVercelBlobConfigured) {
    // Vercel Blob URLs are already full URLs
    return pathname;
  } else {
    // Local filesystem - return path relative to public folder
    return `/screenshots/${pathname.replace(/^\/+/, '')}`;
  }
}

// ============== Vercel Blob Implementation ==============

async function uploadToVercelBlob(
  data: Uint8Array | Buffer,
  pathname: string,
  options?: {
    contentType?: string;
    clienteId?: string;
    type?: string;
  }
): Promise<BlobUploadResult> {
  try {
    // Dynamic import to avoid issues when not in Vercel
    const { put } = await import('@vercel/blob');

    // Convert Uint8Array to Buffer if needed
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);

    const blob = await put(pathname, bufferData, {
      access: 'public',
      contentType: options?.contentType || 'image/png',
      addRandomSuffix: false
    });

    // Track in database
    await prisma.blobFile.create({
      data: {
        url: blob.url,
        pathname: blob.pathname,
        clienteId: options?.clienteId,
        type: options?.type || 'other',
        size: data.length
      }
    }).catch(err => {
      logger.warn('Failed to track blob in database', { error: err.message });
    });

    logger.info('Blob uploaded to Vercel', { pathname: blob.pathname, size: data.length });

    return {
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      size: data.length
    };
  } catch (error) {
    throw error;
  }
}

async function deleteFromVercelBlob(url: string): Promise<BlobDeleteResult> {
  try {
    const { del } = await import('@vercel/blob');

    await del(url);

    // Remove from database tracking
    await prisma.blobFile.delete({
      where: { url }
    }).catch(() => {
      // Ignore if not found in DB
    });

    logger.info('Blob deleted from Vercel', { url });

    return { success: true };
  } catch (error) {
    throw error;
  }
}

// ============== Local Filesystem Implementation ==============

async function uploadToLocalFilesystem(
  data: Uint8Array | Buffer,
  pathname: string,
  options?: {
    contentType?: string;
    clienteId?: string;
    type?: string;
  }
): Promise<BlobUploadResult> {
  const fs = await import('fs');
  const path = await import('path');

  const screenshotsDir = process.env.SCREENSHOTS_DIR || path.join(process.cwd(), 'public', 'screenshots');

  // Ensure directory exists
  await fs.promises.mkdir(screenshotsDir, { recursive: true });

  // Clean pathname
  const cleanPathname = pathname.replace(/^\/+/, '');
  const filePath = path.join(screenshotsDir, cleanPathname);

  // Ensure subdirectories exist
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  // Write file
  await fs.promises.writeFile(filePath, data);

  // Verify file was written
  const stats = await fs.promises.stat(filePath);
  if (stats.size === 0) {
    throw new Error('File written but is empty');
  }

  // Generate URL for local serving
  const url = `/screenshots/${cleanPathname}`;

  // Track in database (optional for local dev)
  await prisma.blobFile.create({
    data: {
      url,
      pathname: cleanPathname,
      clienteId: options?.clienteId,
      type: options?.type || 'other',
      size: stats.size
    }
  }).catch(() => {
    // Ignore DB errors in local dev
  });

  logger.info('Blob saved locally', { pathname: cleanPathname, size: stats.size });

  return {
    success: true,
    url,
    pathname: cleanPathname,
    size: stats.size
  };
}

async function deleteFromLocalFilesystem(url: string): Promise<BlobDeleteResult> {
  const fs = await import('fs');
  const path = await import('path');

  const screenshotsDir = process.env.SCREENSHOTS_DIR || path.join(process.cwd(), 'public', 'screenshots');

  // Extract pathname from URL
  const pathname = url.replace('/screenshots/', '').replace(/^\/+/, '');
  const filePath = path.join(screenshotsDir, pathname);

  try {
    await fs.promises.unlink(filePath);

    // Remove from database
    await prisma.blobFile.delete({
      where: { url }
    }).catch(() => {
      // Ignore if not found
    });

    logger.info('Blob deleted locally', { pathname });

    return { success: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, consider it a success
      return { success: true };
    }
    throw error;
  }
}

// ============== Utility Functions ==============

/**
 * List all blobs for a specific client
 */
export async function listClientBlobs(clienteId: string) {
  return prisma.blobFile.findMany({
    where: { clienteId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get storage stats
 */
export async function getStorageStats() {
  const stats = await prisma.blobFile.aggregate({
    _count: { id: true },
    _sum: { size: true }
  });

  return {
    totalFiles: stats._count.id,
    totalSizeBytes: stats._sum.size || 0,
    totalSizeMB: Math.round((stats._sum.size || 0) / (1024 * 1024) * 100) / 100,
    storageType: isVercelBlobConfigured ? 'vercel-blob' : 'local-filesystem'
  };
}

/**
 * Clean up orphaned blobs (not referenced by any client)
 */
export async function cleanupOrphanedBlobs(): Promise<{ deleted: number; errors: string[] }> {
  const results = { deleted: 0, errors: [] as string[] };

  try {
    // Find blobs without a client reference
    const orphanedBlobs = await prisma.blobFile.findMany({
      where: { clienteId: null }
    });

    for (const blob of orphanedBlobs) {
      const deleteResult = await deleteBlob(blob.url);
      if (deleteResult.success) {
        results.deleted++;
      } else if (deleteResult.error) {
        results.errors.push(`Failed to delete ${blob.url}: ${deleteResult.error}`);
      }
    }

    logger.info('Orphaned blobs cleanup completed', { deleted: results.deleted });
  } catch (error) {
    results.errors.push(`Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return results;
}

export const blobStorage = {
  upload: uploadBlob,
  delete: deleteBlob,
  getUrl: getBlobUrl,
  listClientBlobs,
  getStorageStats,
  cleanupOrphanedBlobs,
  isVercelBlobConfigured
};
