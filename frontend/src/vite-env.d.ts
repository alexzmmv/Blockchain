/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly CONTRACT_ADDRESS: string
  readonly PERKS_ADDRESS: string
  readonly MOCK_KITTIES_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    isMetaMask?: boolean;
  };
}
