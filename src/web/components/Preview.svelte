<script lang="ts">
  import type { FilePreviewData } from '../lib/types';
  import { fade } from 'svelte/transition';
  import CodePreview from './CodePreview.svelte';
  import ImagePreview from './ImagePreview.svelte';
  import PdfPreview from './PdfPreview.svelte';
  import MediaPreview from './MediaPreview.svelte';
  import BinaryPreview from './BinaryPreview.svelte';
  import Breadcrumb from './Breadcrumb.svelte';

  interface Props {
    data: FilePreviewData | null;
    relPath: string;
    dirname: string;
    loading: boolean;
    error: string;
    onNavigate: (relPath: string) => void;
    onExpandDir?: (dirPath: string) => void;
    fullscreen?: boolean;
    onToggleFullscreen?: () => void;
  }

  let { data, relPath, dirname, loading, error, onNavigate, onExpandDir, fullscreen = false, onToggleFullscreen }: Props = $props();
</script>

{#if !relPath && !loading}
  <div class="preview-empty">
    <div class="empty-icon">
      <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 10a4 4 0 014-4h10l4 4h18a4 4 0 014 4v24a4 4 0 01-4 4H8a4 4 0 01-4-4V10z" />
        <line x1="16" y1="26" x2="32" y2="26" />
      </svg>
    </div>
    <div class="empty-main">Select a file to preview</div>
    <div class="empty-sub">Choose a file from the sidebar or use the search</div>
  </div>
{:else if loading}
  <div class="preview-loading">
    <div class="skeleton-container">
      <div class="skeleton-bar" style="width: 80%"></div>
      <div class="skeleton-bar" style="width: 60%"></div>
      <div class="skeleton-bar" style="width: 40%"></div>
    </div>
  </div>
{:else if error}
  <div class="preview-empty">
    <div class="empty-main">Failed to load: {relPath}</div>
  </div>
{:else if data}
  <div class="preview-header-bar">
    <Breadcrumb {dirname} {relPath} {onExpandDir} />
    {#if data.size != null}
      <span class="file-info">{data.size} bytes</span>
    {/if}
    {#if onToggleFullscreen}
      <button class="fullscreen-btn" onclick={onToggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
        {#if fullscreen}
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M5.5 1a.5.5 0 010 1H2.707l3.147 3.146a.5.5 0 11-.708.708L2 2.707V5.5a.5.5 0 01-1 0v-4a.5.5 0 01.5-.5h4zm5 0h4a.5.5 0 01.5.5v4a.5.5 0 01-1 0V2.707l-3.146 3.147a.5.5 0 01-.708-.708L13.293 2H10.5a.5.5 0 010-1zm-9 9a.5.5 0 01.5.5v2.793l3.146-3.147a.5.5 0 01.708.708L2.707 14H5.5a.5.5 0 010 1h-4a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5zm13 0a.5.5 0 01.5.5v4a.5.5 0 01-.5.5h-4a.5.5 0 010-1h2.793l-3.147-3.146a.5.5 0 01.708-.708L14 13.293V10.5a.5.5 0 01.5-.5z"/></svg>
        {:else}
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M1.5 1a.5.5 0 00-.5.5v4a.5.5 0 001 0V2.707l3.146 3.147a.5.5 0 00.708-.708L2.707 2H5.5a.5.5 0 000-1h-4zm13 0h-4a.5.5 0 000 1h2.793l-3.147 3.146a.5.5 0 00.708.708L14 2.707V5.5a.5.5 0 001 0v-4a.5.5 0 00-.5-.5zM1.5 10a.5.5 0 00-.5.5v4a.5.5 0 00.5.5h4a.5.5 0 000-1H2.707l3.147-3.146a.5.5 0 00-.708-.708L2 13.293V10.5a.5.5 0 00-.5-.5zm13 0a.5.5 0 00-.5.5v2.793l-3.146-3.147a.5.5 0 00-.708.708L13.293 14H10.5a.5.5 0 000 1h4a.5.5 0 00.5-.5v-4a.5.5 0 00-.5-.5z"/></svg>
        {/if}
      </button>
    {/if}
  </div>
  {#key relPath}
    <div class="preview-content-fade" in:fade={{ duration: 150 }}>
      {#if data.type === 'html'}
        <CodePreview content={data.content || ''} {relPath} {onNavigate} />
      {:else if data.type === 'image'}
        <ImagePreview url={data.url || ''} alt={relPath} />
      {:else if data.type === 'pdf'}
        <PdfPreview url={data.url || ''} />
      {:else if data.type === 'media'}
        <MediaPreview url={data.url || ''} {relPath} />
      {:else}
        <BinaryPreview
          filename={data.filename || relPath}
          size={data.size || 0}
          url={data.url || ''}
        />
      {/if}
    </div>
  {/key}
{/if}
