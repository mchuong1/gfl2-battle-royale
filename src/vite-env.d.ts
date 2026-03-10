/// <reference types="vite/client" />

declare module 'virtual:public-images' {
  /** Sorted list of filenames (e.g. "256px-Alva_S.png") found in public/images/ at build time. */
  export const imageFiles: string[];
}
