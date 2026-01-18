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

export class Texture2D {
  id: WebGLTexture | null = null;

  async init(
    gl: WebGL2RenderingContext,
    data: TexImageSource,
    mipmapLevel: number,
    internalFormat: number,
    srcFormat: number,
    srcType: number
  ) {
    this.id = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.texImage2D(gl.TEXTURE_2D, mipmapLevel, internalFormat, srcFormat, srcType, data);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
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
