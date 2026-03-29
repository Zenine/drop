<script lang="ts">
  import type { DirEntry, FilePreviewData } from '../lib/types';
  import { fetchFile, prefetch, getCached } from '../lib/api';
  import SearchBox from './SearchBox.svelte';
  import FileTree from './FileTree.svelte';
  import Preview from './Preview.svelte';

  interface Props {
    token: string;
    dirname: string;
    tree: DirEntry;
    expiresAt: number;
    initialFile: string;
    basePath: string;
  }

  let { token, dirname, tree, expiresAt, initialFile, basePath }: Props = $props();

  let currentFile = $state('');
  let previewData: FilePreviewData | null = $state(null);
  let previewLoading = $state(false);
  let previewError = $state('');
  let searchQuery = $state('');
  let sidebarOpen = $state(false);

  // Mobile: 'list' | 'preview'
  let mobileView = $state<'list' | 'preview'>('list');

  // Keyboard navigation
  let focusedIndex = $state(-1);
  let sidebarEl: HTMLElement | undefined = $state();

  function findTreeNode(relPath: string): DirEntry | null {
    if (!relPath) return tree;
    const parts = relPath.split('/');
    let node = tree;
    for (const part of parts) {
      const found = (node.children || []).find(c => c.name === part);
      if (!found) return null;
      node = found;
    }
    return node;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function handleSelect(relPath: string) {
    const node = findTreeNode(relPath);
    if (node && node.is_dir) return;

    if (currentFile === relPath) return;
    currentFile = relPath;
    closeSidebar();
    // On mobile, switch to preview view when file selected
    mobileView = 'preview';

    const newUrl = basePath + '/d/' + token + '/' + relPath;
    history.pushState({ file: relPath }, '', newUrl);

    const cached = getCached(relPath);
    if (cached) {
      previewData = cached;
      previewLoading = false;
      previewError = '';
      return;
    }

    previewData = null;
    previewLoading = true;
    previewError = '';

    fetchFile(token, basePath, relPath)
      .then((data) => {
        if (currentFile !== relPath) return;
        previewData = data;
        previewLoading = false;
      })
      .catch(() => {
        if (currentFile !== relPath) return;
        previewLoading = false;
        previewError = relPath;
      });
  }

  function handlePrefetch(relPath: string) {
    prefetch(token, basePath, relPath);
  }

  function handleNavigate(targetPath: string) {
    handleSelect(targetPath);
  }

  function handleExpandDir(dirPath: string) {
    // On mobile, switch back to list view to show the directory
    if (window.innerWidth <= 768) {
      mobileView = 'list';
    }
  }

  function handleMobileBack() {
    mobileView = 'list';
  }

  // Handle popstate (browser back/forward)
  $effect(() => {
    function onPopState() {
      const prefix = basePath + '/d/' + token + '/';
      const path = window.location.pathname;
      if (path.indexOf(prefix) === 0) {
        const relPath = decodeURIComponent(path.substring(prefix.length));
        if (relPath) {
          currentFile = '';
          handleSelect(relPath);
        }
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });

  // Load initial file
  $effect(() => {
    if (initialFile) {
      queueMicrotask(() => {
        handleSelect(initialFile);
      });
    }
  });

  // Keyboard navigation on sidebar
  function getVisibleItems(): HTMLElement[] {
    if (!sidebarEl) return [];
    return Array.from(sidebarEl.querySelectorAll('.tree-item'));
  }

  function handleSidebarKeydown(e: KeyboardEvent) {
    const items = getVisibleItems();
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
      items[focusedIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      items[focusedIndex]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const item = items[focusedIndex];
      if (item && item.getAttribute('aria-expanded') === 'false') {
        item.click(); // expand folder
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const item = items[focusedIndex];
      if (item && item.getAttribute('aria-expanded') === 'true') {
        item.click(); // collapse folder
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[focusedIndex];
      if (item) {
        const path = item.getAttribute('data-path');
        if (path != null) {
          const node = findTreeNode(path);
          if (node && !node.is_dir) {
            handleSelect(path);
          } else {
            item.click();
          }
        }
      }
    }
  }

  // Get the filename from currentFile
  let currentFileName = $derived(currentFile ? currentFile.split('/').pop() || '' : '');
</script>

<div class="header">
  <button class="menu-btn" onclick={toggleSidebar} aria-label="Toggle sidebar">&#9776;</button>
  <span class="dirname">{dirname}</span>
  <span class="shared-badge">
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 1a4 4 0 00-4 4v2H3a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1h-1V5a4 4 0 00-4-4zm2.5 6H5.5V5a2.5 2.5 0 015 0v2z"/></svg>
    shared
  </span>
</div>

<div class="layout" class:mobile-preview={mobileView === 'preview'}>
  <div
    class="sidebar-overlay"
    class:visible={sidebarOpen}
    onclick={closeSidebar}
    role="presentation"
  ></div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <nav
    class="sidebar"
    class:mobile-open={sidebarOpen}
    bind:this={sidebarEl}
    onkeydown={handleSidebarKeydown}
  >
    <SearchBox bind:query={searchQuery} />
    <FileTree
      {tree}
      activePath={currentFile}
      {searchQuery}
      onSelect={handleSelect}
      onPrefetch={handlePrefetch}
    />
  </nav>
  <main class="preview-pane">
    {#if mobileView === 'preview' && currentFile}
      <div class="mobile-back-bar">
        <button class="mobile-back-btn" onclick={handleMobileBack} aria-label="Back to file list">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path fill-rule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"/></svg>
        </button>
        <span class="mobile-back-filename">{currentFileName}</span>
      </div>
    {/if}
    <Preview
      data={previewData}
      relPath={currentFile}
      {dirname}
      {tree}
      loading={previewLoading}
      error={previewError}
      onNavigate={handleNavigate}
      onExpandDir={handleExpandDir}
    />
  </main>
</div>
