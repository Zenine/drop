<script lang="ts">
  interface Props {
    query: string;
  }

  let { query = $bindable() }: Props = $props();
</script>

<div class="search-box">
  <svg class="search-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
    <path d="M11.5 7a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"/>
  </svg>
  <input
    type="text"
    placeholder="Search files..."
    autocomplete="off"
    spellcheck="false"
    bind:value={query}
  />
</div>
