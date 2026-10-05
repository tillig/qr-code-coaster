<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, open = true, children }: { title: string; open?: boolean; children: Snippet } = $props();
</script>

<details class="panel" {open}>
  <summary><h2>{title}</h2></summary>
  <div class="body">
    {@render children()}
  </div>
</details>

<style>
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  summary {
    cursor: pointer;
    padding: 0.8rem 1rem;
    list-style-position: inside;
  }

  summary h2 {
    display: inline;
    font-size: 1.05rem;
  }

  .body {
    display: grid;
    gap: 1rem;
    padding: 0 1rem 1rem;
  }
</style>
