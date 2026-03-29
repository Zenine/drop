<script lang="ts">
  import { formatSize } from '../lib/format';

  interface Props {
    filename: string;
    size: number;
    url: string;
  }

  let { filename, size, url }: Props = $props();
</script>

<div class="preview-binary">
  <div class="filename">{filename}</div>
  <div>{formatSize(size)}</div>
  <a class="dl-btn" href={url} download>Download</a>
</div>
