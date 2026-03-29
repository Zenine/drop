<script lang="ts">
  interface Props {
    dirname: string;
    relPath: string;
    onExpandDir?: (dirPath: string) => void;
  }

  let { dirname, relPath, onExpandDir }: Props = $props();

  let parts = $derived(relPath.split('/'));

  function handleClick(index: number) {
    if (!onExpandDir) return;
    // Build the directory path up to this segment
    const dirPath = parts.slice(0, index + 1).join('/');
    onExpandDir(dirPath);
  }
</script>

<div class="breadcrumb">
  <span class="breadcrumb-segment breadcrumb-root">{dirname}</span>
  {#each parts as part, i}
    <span class="breadcrumb-sep"> / </span>
    {#if i < parts.length - 1}
      <button class="breadcrumb-segment breadcrumb-link" onclick={() => handleClick(i)}>{part}</button>
    {:else}
      <span class="breadcrumb-segment breadcrumb-current">{part}</span>
    {/if}
  {/each}
</div>
