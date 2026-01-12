import { error } from "@sveltejs/kit";
import { createAssimpScene } from "~/lib/assimp/create-assimp-scene";
import type { AssimpScene } from "~/lib/assimp/types.js";
import { type ShaderSources } from "~/lib/shaders.js";

import vertexShader from "./vert.glsl?raw";
import fragmentShader from "./frag.glsl?raw";

export async function load({ fetch }) {
  const [objResponse, objMaterialResponse] = await Promise.all([
    fetch("/models/backpack/backpack.obj"),
    fetch("/models/backpack/backpack.mtl")
  ]);
  const [modelTextInBytes, modelMtlTextInBytes] = await Promise.all([
    objResponse.arrayBuffer(),
    objMaterialResponse.arrayBuffer()
  ]);
  let assimpScene: AssimpScene;
  try {
    assimpScene = await createAssimpScene([
      { data: modelTextInBytes, path: "/models/backpack/backpack.obj" },
      { data: modelMtlTextInBytes, path: "/models/backpack/backpack.mtl" }
    ]);
  } catch (assimpError) {
    error(500, `Failed to load model: ${assimpError}`);
  }
  const shaderSources: ShaderSources = {
    vertex: vertexShader,
    fragment: fragmentShader
  };
  return { assimpScene, modelBaseDir: "/models/backpack", shaderSources };
}
