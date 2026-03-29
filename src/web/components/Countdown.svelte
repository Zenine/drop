<script lang="ts">
  import { formatTime } from '../lib/format';

  interface Props {
    expiresAt: number;
  }

  let { expiresAt }: Props = $props();

  let remaining = $state(0);

  $effect(() => {
    remaining = Math.max(0, expiresAt - Date.now() / 1000);
    const iv = setInterval(() => {
      remaining = Math.max(0, expiresAt - Date.now() / 1000);
    }, 1000);
    return () => clearInterval(iv);
  });

  let display = $derived(formatTime(remaining));
</script>

<span class="countdown">{display}</span>
