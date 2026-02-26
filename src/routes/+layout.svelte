<script>
  import "~/app.css";
  let { children } = $props();
</script>

<div
  class="relative min-h-screen bg-blue-100 font-mono text-blue-900 dark:bg-blue-900 dark:text-blue-100"
>
  {@render children()}
</div>
