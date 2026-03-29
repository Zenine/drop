<script lang="ts">
  interface Props {
    url: string;
    alt: string;
  }

  let { url, alt }: Props = $props();
</script>

<div class="preview-image">
  <img src={url} {alt} />
</div>
