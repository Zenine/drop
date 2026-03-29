<script lang="ts">
  interface Props {
    query: string;
  }

  let { query = $bindable() }: Props = $props();
</script>

<div class="search-box">
  <input
    type="text"
    placeholder="Filter files&hellip;"
    autocomplete="off"
    spellcheck="false"
    bind:value={query}
  />
</div>
