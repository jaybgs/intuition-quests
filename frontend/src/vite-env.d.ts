/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_API_URL: string;
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Declare custom web components for TypeScript
declare namespace JSX {
  interface IntrinsicElements {
    'appkit-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { size?: string }, HTMLElement>;
  }
}
