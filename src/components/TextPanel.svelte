<script lang="ts">
  import { settings } from '../app/state.svelte';
  import Panel from './Panel.svelte';
  import TextEditor from './TextEditor.svelte';
</script>

<Panel title="6. Text" open={false}>
  <TextEditor label="Above the code" text={settings.topText} />
  <TextEditor label="Below the code" text={settings.bottomText} />
  <p class="hint">The code shrinks to make room for text. Bold fonts and letters at least 4 mm tall print best.</p>
</Panel>
