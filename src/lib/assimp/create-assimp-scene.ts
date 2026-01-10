import init from "assimpts";
import { Convert } from "~/lib/assimp/to-and-from-json";
import { AssimpSceneFlags, type AssimpScene } from "~/lib/assimp/types";

/** Creates an {@link AssimpScene} from a file (or set of files) representing a 3D model
 * (as long as the format is
 * {@link https://the-asset-importer-lib-documentation.readthedocs.io/en/latest/about/introduction.html | supported by Assimp}).
 *
 * Uses {@link https://github.com/Fripe070/assimpts|AssimpTS} to hook into Assimp's model-loading and processing functionality.
 *
 * @param files An array of files to process.
 * The first file should be the main model file, and any additional files
 * should be resources referenced by the main file (e.g. textures, material files, etc.).
 *  */
export async function createAssimpScene(
  files: { data: ArrayBuffer; path: string }[]
): Promise<AssimpScene> {
  const assimp = await init();

  const models = assimp.processFiles(
    files,
    // Output format. assjson is assimp's own JSON format for model output
    "assjson",
    // Flags
    assimp.PostProcessFlags.targetRealtime_Quality.value |
      assimp.PostProcessFlags.flipUVs.value |
      assimp.PostProcessFlags.triangulate.value
  );

  const decoder = new TextDecoder("utf-8");
  const assimpScene = Convert.toAssimpScene(decoder.decode(models[0]));
  if (assimpScene.flags & AssimpSceneFlags.INCOMPLETE) {
    throw new Error("Assimp scene is incomplete");
  }

  return assimpScene;
}
