import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import type { ApiKey, ApiKeyProvider, ApiKeyResponse, CreateApiKeyDTO, UpdateApiKeyDTO } from '@/types/enrichment';

/**
 * Service for managing encrypted API keys
 */
export class ApiKeyService {
  /**
   * Get all API keys (with masked keys for security)
   */
  static async getAll(): Promise<ApiKeyResponse[]> {
    const keys = await prisma.apiKey.findMany({
      orderBy: [
        { enabled: 'desc' },
        { provider: 'asc' },
      ],
    });

    return keys.map((key) => ({
      id: key.id,
      provider: key.provider as ApiKeyProvider,
      maskedKey: maskApiKey(decrypt(key.apiKey)),
      model: key.model,
      enabled: key.enabled,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
  }

  /**
   * Get a single API key by provider (decrypted)
   * Falls back to environment variables if not found in database
   */
  static async getByProvider(provider: ApiKeyProvider): Promise<ApiKey | null> {
    const key = await prisma.apiKey.findUnique({
      where: { provider },
    });

    if (key) {
      return {
        ...key,
        provider: key.provider as ApiKeyProvider,
        apiKey: decrypt(key.apiKey),
      };
    }

    // Fallback to environment variables
    const envKeys = this.getEnvKeys();
    return envKeys.find(k => k.provider === provider) || null;
  }

  /**
   * Get a single API key by ID (masked)
   */
  static async getById(id: string): Promise<ApiKeyResponse | null> {
    const key = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!key) return null;

    return {
      id: key.id,
      provider: key.provider as ApiKeyProvider,
      maskedKey: maskApiKey(decrypt(key.apiKey)),
      model: key.model,
      enabled: key.enabled,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    };
  }

  /**
   * Create a new API key (encrypted)
   */
  static async create(data: CreateApiKeyDTO): Promise<ApiKeyResponse> {
    const encryptedKey = encrypt(data.apiKey);

    const key = await prisma.apiKey.create({
      data: {
        provider: data.provider,
        apiKey: encryptedKey,
        model: data.model ?? null,
        enabled: data.enabled ?? true,
      },
    });

    return {
      id: key.id,
      provider: key.provider as ApiKeyProvider,
      maskedKey: maskApiKey(data.apiKey),
      model: key.model,
      enabled: key.enabled,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    };
  }

  /**
   * Update an existing API key
   */
  static async update(id: string, data: UpdateApiKeyDTO): Promise<ApiKeyResponse> {
    const updateData: {
      apiKey?: string;
      model?: string | null;
      enabled?: boolean;
    } = {};

    if (data.apiKey !== undefined) {
      updateData.apiKey = encrypt(data.apiKey);
    }

    if (data.model !== undefined) {
      updateData.model = data.model;
    }

    if (data.enabled !== undefined) {
      updateData.enabled = data.enabled;
    }

    const key = await prisma.apiKey.update({
      where: { id },
      data: updateData,
    });

    // Get the decrypted key for masking
    const decryptedKey = decrypt(key.apiKey);

    return {
      id: key.id,
      provider: key.provider as ApiKeyProvider,
      maskedKey: maskApiKey(decryptedKey),
      model: key.model,
      enabled: key.enabled,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    };
  }

  /**
   * Delete an API key
   */
  static async delete(id: string): Promise<void> {
    await prisma.apiKey.delete({
      where: { id },
    });
  }

  /**
   * Mark an API key as used
   */
  static async markUsed(provider: ApiKeyProvider): Promise<void> {
    try {
      await prisma.apiKey.update({
        where: { provider },
        data: { lastUsedAt: new Date() },
      });
    } catch {
      // Ignore errors - key might be from environment variables (not in DB)
    }
  }

  /**
   * Get all enabled API keys for a specific category
   * Falls back to environment variables if no keys are configured in database
   */
  static async getEnabledByCategory(category: 'ai' | 'external'): Promise<ApiKey[]> {
    const keys = await prisma.apiKey.findMany({
      where: { enabled: true },
    });

    // Import PROVIDER_INFO dynamically to avoid circular deps
    const { PROVIDER_INFO } = await import('@/types/enrichment');

    const filteredKeys = keys.filter((key) => {
      const providerInfo = PROVIDER_INFO[key.provider as ApiKeyProvider];
      return providerInfo?.category === category;
    });

    const result = filteredKeys.map((key) => ({
      ...key,
      provider: key.provider as ApiKeyProvider,
      apiKey: decrypt(key.apiKey),
    }));

    // Fallback to environment variables if no keys in database
    if (result.length === 0 && category === 'ai') {
      const envKeys = this.getEnvKeys();
      return envKeys;
    }

    return result;
  }

  /**
   * Get API keys from environment variables (fallback)
   */
  private static getEnvKeys(): ApiKey[] {
    const envKeys: ApiKey[] = [];
    const now = new Date();

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      envKeys.push({
        id: 'env-openai',
        provider: 'openai' as ApiKeyProvider,
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        enabled: true,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Gemini
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (geminiKey) {
      envKeys.push({
        id: 'env-gemini',
        provider: 'gemini' as ApiKeyProvider,
        apiKey: geminiKey,
        model: 'gemini-1.5-flash',
        enabled: true,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Grok
    const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    if (grokKey) {
      envKeys.push({
        id: 'env-grok',
        provider: 'grok' as ApiKeyProvider,
        apiKey: grokKey,
        model: 'grok-beta',
        enabled: true,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      envKeys.push({
        id: 'env-deepseek',
        provider: 'deepseek' as ApiKeyProvider,
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: 'deepseek-chat',
        enabled: true,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return envKeys;
  }

  /**
   * Check if a specific provider has an enabled key
   */
  static async hasEnabledKey(provider: ApiKeyProvider): Promise<boolean> {
    const key = await prisma.apiKey.findFirst({
      where: {
        provider,
        enabled: true,
      },
      select: { id: true },
    });

    return key !== null;
  }

  /**
   * Check if a provider exists in the database (not env vars)
   * Used to prevent duplicate entries when creating new keys
   */
  static async existsInDatabase(provider: ApiKeyProvider): Promise<boolean> {
    const key = await prisma.apiKey.findUnique({
      where: { provider },
      select: { id: true },
    });

    return key !== null;
  }

  /**
   * Get decrypted API key for use (internal only)
   * IMPORTANT: Only use this in server-side code, never expose to client
   */
  static async getDecryptedKey(provider: ApiKeyProvider): Promise<string | null> {
    const key = await prisma.apiKey.findFirst({
      where: {
        provider,
        enabled: true,
      },
    });

    if (!key) return null;

    // Mark as used
    await this.markUsed(provider);

    return decrypt(key.apiKey);
  }
}
