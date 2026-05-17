<script lang="ts">
  import type { GitCommitDiffResponse, GitCommitSummary } from '../lib/types';
  import { fetchGitCommitDiff, fetchGitCommits } from '../lib/api';
  import { fade } from 'svelte/transition';

  interface Props {
    token: string;
    basePath: string;
  }

  let { token, basePath }: Props = $props();

  let commits = $state<GitCommitSummary[]>([]);
  let selectedSha = $state('');
  let diff = $state<GitCommitDiffResponse | null>(null);
  let loadingCommits = $state(true);
  let loadingDiff = $state(false);
  let error = $state('');
  let diffError = $state('');
  let iframeEl: HTMLIFrameElement | undefined = $state();

  function formatDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function loadCommits() {
    loadingCommits = true;
    error = '';

    fetchGitCommits(token, basePath)
      .then((data) => {
        commits = data.commits;
        loadingCommits = false;
        if (commits.length > 0 && !selectedSha) {
          void selectCommit(commits[0].sha);
        }
      })
      .catch(() => {
        loadingCommits = false;
        error = 'Failed to load commit history';
      });
  }

  async function selectCommit(sha: string) {
    if (!sha) return;
    if (selectedSha === sha && (loadingDiff || diff)) return;

    selectedSha = sha;
    diff = null;
    diffError = '';
    loadingDiff = true;

    try {
      const nextDiff = await fetchGitCommitDiff(token, basePath, sha);
      if (selectedSha === sha) diff = nextDiff;
    } catch {
      if (selectedSha === sha) diffError = 'Failed to load commit diff';
    } finally {
      if (selectedSha === sha) loadingDiff = false;
    }
  }

  function patchIframe() {
    if (!iframeEl) return;
    const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow?.document;
    if (!iframeDoc) return;

    const style = iframeDoc.createElement('style');
    style.textContent = `
      body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .commit-header { margin-bottom: 14px; }
      .commit-subject { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
      .commit-body { white-space: pre-wrap; color: #6b7280; }
      .commit-meta, .file-summary, .file-stats { color: #6b7280; font-size: 12px; }
      .hash, .file-path { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      details { border: 1px solid #d0d7de; border-radius: 8px; margin: 12px 0; overflow: hidden; }
      summary { cursor: pointer; padding: 10px 12px; background: #f6f8fa; }
      pre { margin: 0; padding: 12px; overflow: auto; font-size: 12px; line-height: 1.45; }
      @media (prefers-color-scheme: dark) {
        body { background: #1e1e1e; color: #d4d4d4; }
        .commit-meta, .file-summary, .file-stats, .commit-body { color: #9ca3af; }
        details { border-color: #3f3f46; }
        summary { background: #252526; }
      }
    `;
    iframeDoc.head.appendChild(style);
  }

  $effect(() => {
    loadCommits();
  });

  $effect(() => {
    if (iframeEl && diff?.diff_html) {
      iframeEl.srcdoc = diff.diff_html;
      iframeEl.onload = () => patchIframe();
    }
  });
</script>

<div class="commits-tab" in:fade={{ duration: 120 }}>
  <aside class="commit-list" aria-label="Recent commits">
    <div class="commit-list-header">
      <div class="commit-list-title">Recent commits</div>
      <div class="commit-list-note">Showing the latest 5 commits. Owner unlock for deeper history is planned.</div>
    </div>

    {#if loadingCommits}
      <div class="commit-state">Loading commits…</div>
    {:else if error}
      <div class="commit-state error">{error}</div>
    {:else if commits.length === 0}
      <div class="commit-state">No commits found.</div>
    {:else}
      <div class="commit-items">
        {#each commits as commit (commit.sha)}
          <button
            class="commit-item"
            class:active={commit.sha === selectedSha}
            onclick={() => selectCommit(commit.sha)}
            title={commit.subject}
          >
            <span class="commit-subject-line">{commit.subject || '(no subject)'}</span>
            <span class="commit-meta-line">
              <span class="commit-sha">{commit.short_sha}</span>
              <span>{commit.author_name}</span>
            </span>
            <span class="commit-date">{formatDate(commit.authored_at)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </aside>

  <section class="commit-preview" aria-label="Commit diff">
    {#if loadingDiff}
      <div class="commit-state">Loading diff…</div>
    {:else if diffError}
      <div class="commit-state error">{diffError}</div>
    {:else if diff}
      <iframe class="preview-frame" sandbox="allow-same-origin" bind:this={iframeEl} title="Commit diff"></iframe>
    {:else}
      <div class="commit-state">Select a commit to view its diff.</div>
    {/if}
  </section>
</div>

<style>
  .commits-tab {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
    background: var(--bg);
  }

  .commit-list {
    width: 340px;
    min-width: 280px;
    max-width: 42%;
    border-right: 1px solid var(--border);
    background: var(--bg-sidebar);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .commit-list-header {
    padding: 14px 14px 10px;
    border-bottom: 1px solid var(--border);
  }

  .commit-list-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }

  .commit-list-note {
    margin-top: 4px;
    color: var(--text-dim);
    font-size: 11px;
    line-height: 1.4;
  }

  .commit-items {
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 4px;
  }

  .commit-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    text-align: left;
    background: transparent;
    color: var(--text);
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
  }

  .commit-item:hover {
    background: var(--bg-hover);
  }

  .commit-item.active {
    background: var(--bg-active);
    border-color: var(--accent);
  }

  .commit-subject-line {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .commit-meta-line,
  .commit-date {
    display: flex;
    gap: 8px;
    color: var(--text-dim);
    font-size: 11px;
  }

  .commit-sha {
    font-family: var(--font-mono);
    color: var(--accent);
  }

  .commit-preview {
    flex: 1;
    min-width: 0;
    display: flex;
    overflow: hidden;
  }

  .commit-state {
    margin: auto;
    color: var(--text-dim);
    font-size: 14px;
    padding: 24px;
    text-align: center;
  }

  .commit-state.error {
    color: #cf222e;
  }

  @media (max-width: 768px) {
    .commits-tab {
      flex-direction: column;
    }

    .commit-list {
      width: 100%;
      min-width: 100%;
      max-width: none;
      max-height: 42%;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }

    .commit-preview {
      min-height: 0;
    }
  }
</style>
