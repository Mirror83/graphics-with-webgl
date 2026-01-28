import type { BreakoutGameDimensions } from "~/lib/game/game.svelte";

/** Initialize a texture (with a single pixel) and load an image.
 * This is done because the image loading is asynchronous; using the pixel initially makes the texture
 * available for use immediately.
 * When the image is finished loading, copy it into the texture.
 */
export function loadTexture(gl: WebGLRenderingContext, url: string): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]); // Opaque blue

  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  let image: HTMLImageElement | null = new Image();
  image.onload = async () => {
    if (!image) return;
    const bitmap = await createImageBitmap(image, {
      // Flip image pixels into the bottom-to-top order that WebGL expects.
      imageOrientation: "flipY"
    });
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    // Unbind texture once done updating it.
    gl.bindTexture(gl.TEXTURE_2D, null);
    image.src = "";
    image = null;
  };
  image.src = url;

  return texture;
}

type Texture2DWrapOptions = {
  wrapS: GLenum;
  wrapT: GLenum;
};

type Texture2DFilterOptions = {
  filterMin: GLenum;
  filterMax: GLenum;
};

interface Texture2DConfig {
  mipmapLevel: number;
  size?: BreakoutGameDimensions;
  border: number;
  internalFormat: GLenum;
  srcFormat: GLenum;
  srcType: GLenum;
  wrapOptions: Texture2DWrapOptions;
  filterOptions: Texture2DFilterOptions;
}

export class Texture2D {
  id: WebGLTexture | null = null;
  mipmapLevel: number;
  size?: BreakoutGameDimensions;
  border: number;
  internalFormat: GLenum;
  srcFormat: GLenum;
  srcType: GLenum;
  wrapOptions: Texture2DWrapOptions;
  filterOptions: Texture2DFilterOptions;

  constructor({
    mipmapLevel = 0,
    size,
    border = 0,
    internalFormat = WebGL2RenderingContext.RGBA,
    srcFormat = WebGL2RenderingContext.RGBA,
    srcType = WebGL2RenderingContext.UNSIGNED_BYTE,
    wrapOptions = {
      wrapS: WebGL2RenderingContext.REPEAT,
      wrapT: WebGL2RenderingContext.REPEAT
    },
    filterOptions = {
      filterMax: WebGL2RenderingContext.LINEAR,
      filterMin: WebGL2RenderingContext.LINEAR
    }
  }: Partial<Texture2DConfig> = {}) {
    this.mipmapLevel = mipmapLevel;
    this.internalFormat = internalFormat;
    this.srcFormat = srcFormat;
    this.srcType = srcType;
    this.size = size;
    this.border = border;
    this.wrapOptions = wrapOptions;
    this.filterOptions = filterOptions;
  }

  init(gl: WebGL2RenderingContext, data?: TexImageSource) {
    this.id = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    if (!data) {
      if (!this.size)
        throw new Error("Texture size must be provided in the constructor if no data is given.");
      gl.texImage2D(
        gl.TEXTURE_2D,
        this.mipmapLevel,
        this.size.x,
        this.size.y,
        this.border,
        this.internalFormat,
        this.srcFormat,
        this.srcType,
        null
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        this.mipmapLevel,
        this.internalFormat,
        this.srcFormat,
        this.srcType,
        data
      );
    }
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    // Unbind texture once done updating it.
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  bind(gl: WebGL2RenderingContext) {
    if (!this.id) throw new Error("The texture is not yet initialized.");
    gl.bindTexture(gl.TEXTURE_2D, this.id);
  }

  unbind(gl: WebGL2RenderingContext) {
    if (!this.id) throw new Error("This texture is not yet initialized.");
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
