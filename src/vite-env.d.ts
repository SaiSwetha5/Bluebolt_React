/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IDP_AUTHORITY: string;
  readonly VITE_IDP_CLIENT_ID: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
