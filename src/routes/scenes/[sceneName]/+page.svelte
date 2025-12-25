<script lang="ts">
  import { defaultClearColor, toHexColourString } from "~/lib/color";
  import type { PageData } from "./$types";
  const { data }: { data: PageData } = $props();
  const bgColour = toHexColourString(defaultClearColor);
</script>

<main class={`text-white`} style:background-color={bgColour}>
  <canvas tabindex="0" class="focus:outline-0" {@attach data.renderWrapper}
    >{data.description}</canvas
  >
</main>
