<script lang="ts">
  import { defaultClearColor, toHexColourString } from "~/lib/color";
  import type { PageData } from "./$types";
  const { data }: { data: PageData } = $props();
  const bgColour = toHexColourString(defaultClearColor);
</script>

<main class={`bg-[${bgColour}] text-white`}>
  <canvas {@attach data.renderWrapper}>{data.description}</canvas>
</main>
