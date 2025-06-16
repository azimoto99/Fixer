import { createClient } from '@supabase/supabase-js';
import { config } from './env';

// Create Supabase client with anon key (for client-side operations)
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Server-side, don't persist sessions
    },
  }
);

// Create Supabase admin client with service role key (for server-side operations)
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Test Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

// Helper function to get user from Supabase Auth
export async function getSupabaseUser(accessToken: string) {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
  
  return user;
}

// Helper function to verify JWT token
export async function verifySupabaseToken(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return null;
    }
    
    return data.user;
  } catch (error) {
    return null;
  }
}

// Storage helpers
export const storage = {
  // Upload file to Supabase Storage
  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    options?: {
      contentType?: string;
      cacheControl?: string;
      upsert?: boolean;
    }
  ) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        contentType: options?.contentType,
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || false,
      });

    if (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }

    return data;
  },

  // Get public URL for file
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  // Delete file from storage
  async deleteFile(bucket: string, path: string) {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  },

  // List files in bucket
  async listFiles(bucket: string, path?: string) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(path);

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
  },
};
