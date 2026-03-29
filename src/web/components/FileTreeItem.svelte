<script lang="ts">
  import type { DirEntry } from '../lib/types';
  import { getFileIcon } from '../lib/icons';
  import { formatSize } from '../lib/format';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import FileTreeItem from './FileTreeItem.svelte';

  interface Props {
    entry: DirEntry;
    depth: number;
    activePath: string;
    searchQuery: string;
    onSelect: (relPath: string) => void;
    onPrefetch: (relPath: string) => void;
  }

  let { entry, depth, activePath, searchQuery, onSelect, onPrefetch }: Props = $props();

  let isOpen = $state(false);

  // Search matching logic
  function matchesSearch(node: DirEntry, query: string): boolean {
    if (!query) return true;
    if (!node.is_dir) {
      return node.name.toLowerCase().includes(query);
    }
    // Directory matches if any child matches
    return node.children.some(c => matchesSearch(c, query));
  }

  let visible = $derived(matchesSearch(entry, searchQuery));
  let forceOpen = $derived(searchQuery !== '' && entry.is_dir && visible);
  let effectiveOpen = $derived(isOpen || forceOpen);

  function toggleDir(e: MouseEvent) {
    e.stopPropagation();
    isOpen = !isOpen;
  }

  function handleDirKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      isOpen = !isOpen;
    }
  }

  function handleFileClick(e: MouseEvent) {
    e.stopPropagation();
    onSelect(entry.rel_path);
  }

  function handleFileKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(entry.rel_path);
    }
  }

  function handleMouseEnter() {
    if (!entry.is_dir) {
      onPrefetch(entry.rel_path);
    }
  }

  // Expand to show a file when it becomes active
  $effect(() => {
    if (entry.is_dir && activePath && activePath.startsWith(entry.rel_path + '/')) {
      isOpen = true;
    }
  });

  let paddingLeft = $derived(8 + depth * 16);
  let isActive = $derived(!entry.is_dir && entry.rel_path === activePath);
</script>

{#if visible}
  {#if entry.is_dir}
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
      class="tree-item"
      style="padding-left: {paddingLeft}px"
      onclick={toggleDir}
      onkeydown={handleDirKeydown}
      role="treeitem"
      aria-expanded={effectiveOpen}
      aria-selected={false}
      tabindex={0}
      data-path={entry.rel_path}
    >
      <span class="icon icon-svg">{@html getFileIcon(entry.name, true, effectiveOpen)}</span>
      <span class="name">{entry.name}</span>
    </div>
    {#if effectiveOpen}
      <div class="tree-group open" transition:slide={{ duration: 150, easing: quintOut }}>
        {#each entry.children as child (child.rel_path)}
          <FileTreeItem
            entry={child}
            depth={depth + 1}
            {activePath}
            {searchQuery}
            {onSelect}
            {onPrefetch}
          />
        {/each}
      </div>
    {/if}
  {:else}
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
      class="tree-item"
      class:active={isActive}
      style="padding-left: {paddingLeft}px"
      data-path={entry.rel_path}
      onclick={handleFileClick}
      onkeydown={handleFileKeydown}
      onmouseenter={handleMouseEnter}
      role="treeitem"
      aria-selected={isActive}
      tabindex={0}
    >
      <span class="icon icon-svg">{@html getFileIcon(entry.name)}</span>
      <span class="name">{entry.name}</span>
      <span class="size">{formatSize(entry.size)}</span>
    </div>
  {/if}
{/if}
