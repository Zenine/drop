<script lang="ts">
  interface Props {
    url: string;
  }

  let { url }: Props = $props();
</script>

<iframe class="preview-frame" src={url} title="PDF preview" style="border:none"></iframe>
