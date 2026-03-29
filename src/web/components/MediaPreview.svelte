<script lang="ts">
  interface Props {
    url: string;
    relPath: string;
  }

  let { url, relPath }: Props = $props();

  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus', 'weba'];
  let ext = $derived(relPath.split('.').pop()?.toLowerCase() || '');
  let isAudio = $derived(audioExts.includes(ext));
</script>

<div class="preview-image">
  {#if isAudio}
    <audio controls style="max-width:100%;max-height:70vh">
      <source src={url} />
    </audio>
  {:else}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video controls style="max-width:100%;max-height:70vh">
      <source src={url} />
    </video>
  {/if}
</div>
