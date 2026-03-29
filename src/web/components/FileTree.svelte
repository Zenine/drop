<script lang="ts">
  import type { DirEntry } from '../lib/types';
  import FileTreeItem from './FileTreeItem.svelte';

  interface Props {
    tree: DirEntry;
    activePath: string;
    searchQuery: string;
    onSelect: (relPath: string) => void;
    onPrefetch: (relPath: string) => void;
  }

  let { tree, activePath, searchQuery, onSelect, onPrefetch }: Props = $props();
</script>

<div class="tree-container">
  {#each tree.children as child (child.rel_path)}
    <FileTreeItem
      entry={child}
      depth={0}
      {activePath}
      {searchQuery}
      {onSelect}
      {onPrefetch}
    />
  {/each}
</div>
