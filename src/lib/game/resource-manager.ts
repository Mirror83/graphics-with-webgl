import { Shader, type ShaderSources } from "~/lib/shaders";
import { Texture2D } from "~/lib/textures";

type TextureName = "ball" | "block_solid" | "block" | "background" | "paddle";
type ShaderName = "sprite";

type Fetch = typeof fetch;

type ShaderSourcesRelativePaths = {
  vertex: string;
  fragment: string;
};

export class ResourceManager {
  #shaders = new Map<ShaderName, Shader>();
  #textures = new Map<TextureName, Texture2D>();
  #fetch: Fetch;
  #breakoutAssetsBaseURL: string;

  constructor(breakoutAssetsBaseURL: string) {
    this.#breakoutAssetsBaseURL = breakoutAssetsBaseURL;
    this.#fetch = (path, init) => {
      return fetch(`${this.#breakoutAssetsBaseURL}/${path}`, init);
    };
  }

  getShader(name: ShaderName): Shader | null {
    return this.#shaders.get(name) ?? null;
  }

  async #getShaderSources(paths: ShaderSourcesRelativePaths): Promise<ShaderSources> {
    const sources = await Promise.all(
      [paths.vertex, paths.fragment].map(async (relativePath) => {
        const response = await this.#fetch(relativePath);
        return await response.text();
      })
    );
    return { vertex: sources[0], fragment: sources[1] };
  }

  async loadShader(
    gl: WebGL2RenderingContext,
    name: ShaderName,
    paths: ShaderSourcesRelativePaths
  ) {
    const sources = await this.#getShaderSources(paths);
    console.debug("resource manager (loadShader):", sources);
    this.#shaders.set(name, new Shader(gl, sources));
  }

  getTexture(name: TextureName): Texture2D | null {
    return this.#textures.get(name) ?? null;
  }

  async #loadTexImageSource(url: string): Promise<TexImageSource> {
    return new Promise((resolve, reject) => {
      let image: HTMLImageElement | null = new Image();
      image.onload = async () => {
        if (!image) {
          return;
        }
        const bitmap = await createImageBitmap(image, {
          // Flip image pixels into the bottom-to-top order that WebGL expects.
          imageOrientation: "flipY"
        });
        // Cleanup image element after creating bitmap.
        image.src = "";
        image = null;
        resolve(bitmap);
      };
      image.onerror = (err) => {
        reject(err);
      };
      // This will start loading the image from the provided URL.
      image.src = url;
    });
  }

  async loadTexture(gl: WebGL2RenderingContext, name: TextureName, path: string) {
    const url = `${this.#breakoutAssetsBaseURL}/${path}`;
    const textureData = await this.#loadTexImageSource(url);

    const texture = new Texture2D();
    const mipmapLevel = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;

    texture.init(gl, textureData, mipmapLevel, internalFormat, srcFormat, srcType);
    this.#textures.set(name, texture);
  }

  async loadLevelText(path: string): Promise<string> {
    const response = await this.#fetch(path);
    return await response.text();
  }

  clearResources(gl: WebGL2RenderingContext) {
    Object.values(this.#shaders).forEach((shader) => {
      gl.deleteProgram(shader.program);
    });
    Object.values(this.#textures).forEach((texture) => {
      if (texture.id) {
        gl.deleteTexture(texture.id);
        texture.id = null;
      }
    });
  }
}
