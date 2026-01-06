import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";
import { type RenderWrapper } from "~/lib/render";
import { sceneDetailsList } from "~/lib/scene-details";

/**
 * Dynamically imports the render wrapper function from the scene's module
 * (obtained using the sceneName)
 */
async function getRenderWrapper(sceneName: string): Promise<RenderWrapper | null> {
  // Some important limitations to consider that allow Vite to analyze dynamic imports:
  // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
  const module = await import(`~/lib/scenes/${sceneName}/${sceneName}.ts`);
  // The module is expected to have a default export that is the render wrapper function
  const renderWrapper = module.default;
  if (!renderWrapper) {
    return null;
  }
  return renderWrapper as RenderWrapper;
}

export const load: PageLoad = async ({ params }) => {
  const { sceneName } = params;
  const details = sceneDetailsList.find((s) => s.route === `${sceneName}`);
  if (!details) {
    throw error(404, `Scene not found: ${sceneName}`);
  }

  const renderWrapper = await getRenderWrapper(sceneName);
  if (!renderWrapper) {
    error(404, `Scene function not found for ${sceneName}`);
  }

  return { renderWrapper, ...details };
};

export const entries: EntryGenerator = async () => {
  return sceneDetailsList.map((scene) => {
    return { sceneName: scene.route };
  });
};
