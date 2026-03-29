<script lang="ts">
  import type { DirEntry } from './lib/types';
  import DirBrowser from './components/DirBrowser.svelte';

  interface Props {
    token: string;
    dirname: string;
    tree: DirEntry;
    expiresAt: number;
    initialFile: string;
    basePath: string;
  }

  let { token, dirname, tree, expiresAt, initialFile, basePath }: Props = $props();
</script>

<DirBrowser {token} {dirname} {tree} {expiresAt} {initialFile} {basePath} />
