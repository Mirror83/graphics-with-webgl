import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";
import { type RenderWrapper } from "~/lib/render";
import { parts } from "~/lib/scene-details";

/**
 * Dynamically imports the render wrapper function from the scene's module
 * (obtained using the sceneName)
 */
async function getRenderWrapper(
  partName: string,
  sceneName: string
): Promise<RenderWrapper | null> {
  // Some important limitations to consider that allow Vite to analyze dynamic imports:
  // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
  const module = await import(`~/lib/scenes/${partName}/${sceneName}/${sceneName}.ts`);
  // The module is expected to have a default export that is the render wrapper function
  const renderWrapper = module.default;
  if (!renderWrapper) {
    return null;
  }
  return renderWrapper as RenderWrapper;
}

export const load: PageLoad = async ({ params }) => {
  const { partName, sceneName } = params;
  const part = parts[partName];
  if (!part) {
    throw error(404, `Part not found: ${partName}`);
  }

  const details = part.scenes.find((s) => s.route === `${sceneName}`);
  if (!details) {
    throw error(404, `Scene not found: ${sceneName}`);
  }

  const renderWrapper = await getRenderWrapper(partName, sceneName);
  if (!renderWrapper) {
    error(404, `Scene function not found for ${sceneName}`);
  }

  return { renderWrapper, ...details };
};

export const entries: EntryGenerator = async () => {
  const paths = Object.entries(parts).flatMap(([partName, part]) => {
    return part.scenes.map((scene) => ({
      partName,
      sceneName: scene.route
    }));
  });

  return paths;
};
