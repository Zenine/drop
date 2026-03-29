<script lang="ts">
  import type { DirEntry, FilePreviewData } from '../lib/types';
  import { fetchFile, prefetch, getCached } from '../lib/api';
  import Countdown from './Countdown.svelte';
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
    // If it's a directory, just ignore (tree item handles expand)
    const node = findTreeNode(relPath);
    if (node && node.is_dir) return;

    if (currentFile === relPath) return;
    currentFile = relPath;
    closeSidebar();

    // Update URL
    const newUrl = basePath + '/d/' + token + '/' + relPath;
    history.pushState({ file: relPath }, '', newUrl);

    // Check cache first
    const cached = getCached(relPath);
    if (cached) {
      previewData = cached;
      previewLoading = false;
      previewError = '';
      return;
    }

    // Fetch
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
    // Navigate to a file from within an iframe link
    handleSelect(targetPath);
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
      // Use a microtask to ensure the tree is rendered
      queueMicrotask(() => {
        handleSelect(initialFile);
      });
    }
  });
</script>

<div class="header">
  <button class="sidebar-toggle" onclick={toggleSidebar} aria-label="Toggle sidebar">&#9776;</button>
  <span class="header-title">{dirname}</span>
  <span class="header-meta">expires in <Countdown {expiresAt} /></span>
</div>
<div class="layout">
  <div
    class="sidebar-overlay"
    class:visible={sidebarOpen}
    onclick={closeSidebar}
    role="presentation"
  ></div>
  <nav class="sidebar" class:mobile-open={sidebarOpen}>
    <SearchBox bind:query={searchQuery} />
    <FileTree
      {tree}
      activePath={currentFile}
      {searchQuery}
      onSelect={handleSelect}
      onPrefetch={handlePrefetch}
    />
  </nav>
  <main class="preview">
    <Preview
      data={previewData}
      relPath={currentFile}
      {dirname}
      loading={previewLoading}
      error={previewError}
      onNavigate={handleNavigate}
    />
  </main>
</div>
