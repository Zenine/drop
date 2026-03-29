import { mount } from 'svelte';
import App from './App.svelte';

interface VibeFSConfig {
  token: string;
  dirname: string;
  tree: any;
  expiresAt: number;
  initialFile: string;
  basePath: string;
}

declare global {
  interface Window {
    __VIBEFS__: VibeFSConfig;
  }
}

const config = window.__VIBEFS__;

mount(App, {
  target: document.getElementById('app')!,
  props: {
    token: config.token,
    dirname: config.dirname,
    tree: config.tree,
    expiresAt: config.expiresAt,
    initialFile: config.initialFile,
    basePath: config.basePath,
  },
});
