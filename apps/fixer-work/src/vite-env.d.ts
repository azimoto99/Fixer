/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_MAPBOX_ACCESS_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    ENV: {
      VITE_API_URL: string
      VITE_SUPABASE_URL: string
      VITE_SUPABASE_ANON_KEY: string
      VITE_MAPBOX_ACCESS_TOKEN: string
    }
  }
}

export {}
