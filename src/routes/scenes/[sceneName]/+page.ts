import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { sceneDetails, type RenderWrapper } from "~/lib/render";
import { getShaderSources } from "~/lib/shaders";

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
  const details = sceneDetails.find((s) => s.route === `${sceneName}`);
  if (!details) {
    throw error(404, `Scene not found: ${sceneName}`);
  }

  const shaderSources = await getShaderSources(sceneName);
  const renderWrapper = await getRenderWrapper(sceneName);
  if (!renderWrapper) {
    error(404, `Scene function not found for ${sceneName}`);
  }

  return { shaderSources, renderWrapper, ...details };
};
