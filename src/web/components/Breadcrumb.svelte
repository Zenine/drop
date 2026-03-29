<script lang="ts">
  interface Props {
    dirname: string;
    relPath: string;
  }

  let { dirname, relPath }: Props = $props();

  let parts = $derived(relPath.split('/'));
</script>

<div class="breadcrumb">
  {dirname}
  {#each parts as part}
    {' / '}{part}
  {/each}
</div>
