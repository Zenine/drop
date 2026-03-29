<script lang="ts">
  interface Props {
    content: string;
    relPath: string;
    onNavigate: (relPath: string) => void;
  }

  let { content, relPath, onNavigate }: Props = $props();
  let iframeEl: HTMLIFrameElement | undefined = $state();

  function patchIframe() {
    if (!iframeEl) return;
    const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow?.document;
    if (!iframeDoc) return;

    // Inject CSS to hide the file-header and file-footer (prevents double header)
    const style = iframeDoc.createElement('style');
    style.textContent = '.file-header, .file-footer { display: none !important; }';
    iframeDoc.head.appendChild(style);

    // Patch links for in-app navigation
    const links = iframeDoc.querySelectorAll('a[href]');
    const currentDir = relPath.includes('/')
      ? relPath.substring(0, relPath.lastIndexOf('/') + 1)
      : '';

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:')) continue;

      const resolved = href.replace(/^\.\//, '');
      const pathParts = (currentDir + resolved).split('/');
      const normalized: string[] = [];
      for (const p of pathParts) {
        if (p === '..') { if (normalized.length) normalized.pop(); }
        else if (p && p !== '.') normalized.push(p);
      }
      const targetPath = normalized.join('/');

      link.style.cursor = 'pointer';
      link.addEventListener('click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        onNavigate(targetPath);
      });
    }
  }

  $effect(() => {
    if (iframeEl && content) {
      iframeEl.srcdoc = content;
      iframeEl.onload = () => patchIframe();
    }
  });
</script>

<iframe
  class="preview-frame"
  sandbox="allow-same-origin"
  bind:this={iframeEl}
  title="File preview"
></iframe>
