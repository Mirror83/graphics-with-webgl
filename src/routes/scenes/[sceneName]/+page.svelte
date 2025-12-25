<script lang="ts">
  import type { PageData } from "./$types";
  const { data }: { data: PageData } = $props();
</script>

<canvas {@attach data.renderWrapper}>{data.description}</canvas>
