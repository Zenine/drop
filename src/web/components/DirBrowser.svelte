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
  let sidebarWidth = $state(260);
  let isResizing = $state(false);
  let fullscreen = $state(false);

  // Mobile bottom nav: 'preview' or 'files'
  let mobileTab = $state<'preview' | 'files'>('preview');

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
    // On mobile, switch to preview tab when file selected
    mobileTab = 'preview';

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
    // This triggers a scroll/focus to a directory in the sidebar
    // For now just open the sidebar on mobile
    if (window.innerWidth <= 768) {
      mobileTab = 'files';
    }
  }

  function handleToggleFullscreen() {
    fullscreen = !fullscreen;
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

  // Escape key exits fullscreen
  $effect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && fullscreen) {
        fullscreen = false;
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
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

  // Resizable split pane
  function startResize(e: MouseEvent) {
    e.preventDefault();
    isResizing = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    function onMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      sidebarWidth = Math.max(180, Math.min(500, startWidth + delta));
    }

    function onMouseUp() {
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  // Touch swipe on preview to open files (mobile)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function handleTouchStart(e: TouchEvent) {
    if (window.innerWidth > 768) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e: TouchEvent) {
    if (window.innerWidth > 768) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartTime;

    // Swipe right to open files — horizontal > 50px, more horizontal than vertical, fast enough
    if (dx > 50 && Math.abs(dy) < Math.abs(dx) && dt < 400) {
      mobileTab = 'files';
    }
  }
</script>

{#if !fullscreen}
  <div class="header">
    <button class="sidebar-toggle" onclick={toggleSidebar} aria-label="Toggle sidebar">&#9776;</button>
    <span class="header-title">{dirname}</span>
    <span class="header-meta">expires in <Countdown {expiresAt} /></span>
  </div>
{/if}
<div class="layout" class:fullscreen>
  {#if !fullscreen}
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
      class:mobile-files={mobileTab === 'files'}
      style="width: {sidebarWidth}px; min-width: {sidebarWidth}px;"
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
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="resize-handle"
      onmousedown={startResize}
      class:resizing={isResizing}
      role="separator"
      aria-label="Resize sidebar"
    ></div>
  {/if}
  <main
    class="preview"
    class:mobile-preview={mobileTab === 'preview'}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    <Preview
      data={previewData}
      relPath={currentFile}
      {dirname}
      loading={previewLoading}
      error={previewError}
      onNavigate={handleNavigate}
      onExpandDir={handleExpandDir}
      {fullscreen}
      onToggleFullscreen={handleToggleFullscreen}
    />
  </main>
</div>

{#if !fullscreen}
  <div class="mobile-bottom-nav">
    <button
      class="mobile-tab"
      class:active={mobileTab === 'files'}
      onclick={() => { mobileTab = 'files'; }}
    >
      <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor"><path d="M1.5 2A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5V5a1.5 1.5 0 00-1.5-1.5H7.71L6.15 2.22A.75.75 0 005.64 2H1.5z"/></svg>
      <span>Files</span>
    </button>
    <button
      class="mobile-tab"
      class:active={mobileTab === 'preview'}
      onclick={() => { mobileTab = 'preview'; }}
    >
      <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor"><path d="M8 3C3.6 3 .5 7.4.3 7.7a.5.5 0 000 .6C.5 8.6 3.6 13 8 13s7.5-4.4 7.7-4.7a.5.5 0 000-.6C15.5 7.4 12.4 3 8 3zm0 8.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7zM8 6a2 2 0 100 4 2 2 0 000-4z"/></svg>
      <span>Preview</span>
    </button>
  </div>
{/if}
