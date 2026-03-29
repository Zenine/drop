<script lang="ts">
  import type { FilePreviewData } from '../lib/types';
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
  }

  let { data, relPath, dirname, loading, error, onNavigate }: Props = $props();
</script>

{#if !relPath && !loading}
  <div class="preview-empty">Select a file to preview</div>
{:else if loading}
  <div class="preview-loading">Loading&hellip;</div>
{:else if error}
  <div class="preview-empty">Failed to load: {relPath}</div>
{:else if data}
  <Breadcrumb {dirname} {relPath} />
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
{/if}
