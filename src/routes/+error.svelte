<script lang="ts">
  import { page } from "$app/state";
</script>

<div class="flex min-h-screen flex-col items-center justify-center px-4 text-center">
  <div class="mb-4">
    <h1 class="text-4xl">{page.status}</h1>
    <p>{page.error?.message ?? "Something went wrong."}</p>
  </div>
  <a href="/" class="underline">Back to index page</a>
</div>
