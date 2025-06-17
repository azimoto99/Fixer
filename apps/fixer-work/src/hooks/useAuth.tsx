import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { User, LoginRequest, RegisterRequest } from '@fixer/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - using mock auth');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // Mock user for development when Supabase is not configured
      setUser({
        id: 'mock-user-id',
        email: 'worker@example.com',
        firstName: 'John',
        lastName: 'Worker',
        avatar: undefined,
        phone: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          firstName: session.user.user_metadata?.firstName || '',
          lastName: session.user.user_metadata?.lastName || '',
          avatar: session.user.user_metadata?.avatar,
          phone: session.user.user_metadata?.phone,
          createdAt: session.user.created_at,
          updatedAt: session.user.updated_at || session.user.created_at,
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          firstName: session.user.user_metadata?.firstName || '',
          lastName: session.user.user_metadata?.lastName || '',
          avatar: session.user.user_metadata?.avatar,
          phone: session.user.user_metadata?.phone,
          createdAt: session.user.created_at,
          updatedAt: session.user.updated_at || session.user.created_at,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginRequest) => {
    if (!supabase) {
      throw new Error('Authentication not configured');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const register = async (data: RegisterRequest) => {
    if (!supabase) {
      throw new Error('Authentication not configured');
    }

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'worker', // Workers use the work app
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    if (!supabase) {
      setUser(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!supabase || !user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        avatar: data.avatar,
        phone: data.phone,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
