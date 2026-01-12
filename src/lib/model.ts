import { vec2, vec3 } from "gl-matrix";
import {
  AssimpPropertyKey,
  AssimpTextureType,
  type AssimpMaterial,
  type AssimpMesh,
  type AssimpNode,
  type AssimpScene
} from "~/lib/assimp/types";
import { Mesh, type TextureData, type VertexData } from "~/lib/mesh";
import type { Shader } from "~/lib/shaders";
import { loadTexture } from "~/lib/textures";

/** A 3D object (model) consisting of multiple meshes
 * (smaller 3D objects) and associated textures.
 *
 * This class processes an {@link AssimpScene}
 * to extract {@link Mesh}es that can be drawn together to form a larger object.
 *  */
export class Model {
  assimpScene: AssimpScene;
  meshes: Mesh[] = [];
  /** Used when loading referenced resources such as textures and material files */
  baseDirectory: string = "";

  #loadedTextures: TextureData[] = [];

  constructor(gl: WebGL2RenderingContext, assimpScene: AssimpScene, baseDirectory: string = "") {
    this.assimpScene = assimpScene;
    this.baseDirectory = baseDirectory;
    this.processAssimpScene(gl, assimpScene.rootnode, assimpScene);
  }

  draw(gl: WebGL2RenderingContext, shader: Shader) {
    gl.useProgram(shader.program);
    for (const mesh of this.meshes) {
      mesh.draw(gl, shader);
    }
    gl.useProgram(null);
  }

  processAssimpScene(gl: WebGL2RenderingContext, node: AssimpNode, scene: AssimpScene) {
    // Process all the node's meshes (if any)
    for (let i = 0; node.meshes && i < node.meshes.length; i++) {
      const assimpMesh = scene.meshes[node.meshes[i]];
      this.meshes.push(this.processAssimpMesh(gl, assimpMesh, scene));
    }
    // Then do the same for each of its children
    for (let i = 0; node.children && i < node.children.length; i++) {
      this.processAssimpScene(gl, node.children[i], scene);
    }
  }

  processAssimpMesh(gl: WebGL2RenderingContext, mesh: AssimpMesh, scene: AssimpScene): Mesh {
    const vertices: VertexData[] = [];
    const indices: number[] = [];
    const textures: TextureData[] = [];

    // Assimp stores texture coordinates as a flat array,
    // so we need to track our position in that array separately
    let textureComponentIndex = 0;
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const position = vec3.fromValues(
        mesh.vertices[i],
        mesh.vertices[i + 1],
        mesh.vertices[i + 2]
      );
      const normal = vec3.fromValues(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
      let texCoords: vec2;
      if (mesh.texturecoords[0]) {
        texCoords = vec2.fromValues(
          mesh.texturecoords[0][textureComponentIndex] ?? 0,
          mesh.texturecoords[0][textureComponentIndex + 1] ?? 0
        );
        textureComponentIndex += 2;
      } else {
        texCoords = vec2.fromValues(0, 0);
      }
      vertices.push({ position, normal, texCoords });
    }

    for (let i = 0; i < mesh.faces.length; i++) {
      const faceIndices = mesh.faces[i];
      for (let j = 0; j < faceIndices.length; j++) {
        indices.push(faceIndices[j]);
      }
    }

    if (mesh.materialindex >= 0) {
      const material = scene.materials[mesh.materialindex];
      const diffuseMaps = this.loadMaterialTextures(gl, material, AssimpTextureType.DIFFUSE);
      textures.push(...diffuseMaps);
      const specularMaps = this.loadMaterialTextures(gl, material, AssimpTextureType.SPECULAR);
      textures.push(...specularMaps);
    }

    return new Mesh(gl, vertices, new Uint32Array(indices), textures);
  }

  loadMaterialTextures(
    gl: WebGL2RenderingContext,
    material: AssimpMaterial,
    assimpTextureType: AssimpTextureType.DIFFUSE | AssimpTextureType.SPECULAR
  ): TextureData[] {
    const textures: TextureData[] = [];
    for (let i = 0; i < material.properties.length; i++) {
      const property = material.properties[i];
      if (
        property.key === AssimpPropertyKey.TEXTURE_FILE &&
        property.semantic === assimpTextureType
      ) {
        const texturePath = property.value as string;
        const absoluteTexturePath = `${this.baseDirectory}/${texturePath}`;
        const hasBeenLoaded = this.#loadedTextures.some(
          (data) => data.path === absoluteTexturePath
        );
        if (hasBeenLoaded) {
          break;
        }
        const texture = loadTexture(gl, absoluteTexturePath);
        const textureData: TextureData = {
          id: texture,
          type: assimpTextureType === AssimpTextureType.DIFFUSE ? "diffuse" : "specular",
          path: absoluteTexturePath
        };
        textures.push(textureData);
        this.#loadedTextures.push(textureData);
      }
    }
    return textures;
  }
}
