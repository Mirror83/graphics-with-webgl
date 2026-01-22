import { vec2, vec4 } from "gl-matrix";
import { BreakoutGameObject } from "~/lib/game/game-object";
import type { Shader } from "~/lib/shaders";
import type { Texture2D } from "~/lib/textures";

export type Particle = {
  position: vec2;
  velocity: vec2;
  colour: vec4;
  lifetime: number;
};

const NUMBER_OF_PARTICLES = 500;
const NUMBER_OF_NEW_PARTICLES_PER_FRAME = 5;

const EPSILON = 1e-5;

/**
 * Returns a random number between `min` and `max` (inclusive of min, exclusive of max).
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_number_between_two_values */
function randRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/** A container for rendering a large number of particles
 *  by repeatedly spawning and updating particles, and killing them
 *  after a given amount of time. */
export class ParticleGenerator {
  #particles: Particle[];
  #shader: Shader;
  #texture: Texture2D;
  #quadVertexArrayObject: WebGLVertexArrayObject | null = null;
  #lastUsedParticle = 0;

  constructor(
    gl: WebGL2RenderingContext,
    shader: Shader,
    texture: Texture2D,
    numberOfParticles: number = NUMBER_OF_PARTICLES
  ) {
    this.#shader = shader;
    this.#texture = texture;
    this.#initVertexArrayBuffer(gl);
    this.#particles = Array.from({ length: numberOfParticles }, () => ({
      position: vec2.create(),
      velocity: vec2.create(),
      colour: vec4.fromValues(1.0, 1.0, 1.0, 1.0),
      lifetime: 0
    }));
    console.debug("particles:", this.#particles);
  }

  #initVertexArrayBuffer(gl: WebGL2RenderingContext) {
    // prettier-ignore
    const vertices = new Float32Array([
      // pos    // tex
      0.0, 1.0, 0.0, 1.0,
      1.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0, 0.0,

      0.0, 1.0, 0.0, 1.0,
      1.0, 1.0, 1.0, 1.0,
      1.0, 0.0, 1.0, 0.0
    ]);
    this.#quadVertexArrayObject = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    gl.bindVertexArray(this.#quadVertexArrayObject);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const totalComponentsPerVertex = 4;

    const positionAndTextureCoordLocation = 0;
    const size = totalComponentsPerVertex;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = totalComponentsPerVertex * vertices.BYTES_PER_ELEMENT;
    const offset = 0;

    gl.enableVertexAttribArray(positionAndTextureCoordLocation);
    gl.vertexAttribPointer(positionAndTextureCoordLocation, size, type, normalize, stride, offset);

    // Unbind vertex array object and buffer after setup
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  #particleIsDead(particle: Particle): boolean {
    return particle.lifetime <= EPSILON;
  }

  /** Returns the first Particle index that's currently unused i.e. `lifetime <= 0.0f` or the first index if no particles are unused */
  #firstUnusedParticle(): number {
    for (let i = this.#lastUsedParticle; i < this.#particles.length; i++) {
      if (this.#particleIsDead(this.#particles[i])) {
        this.#lastUsedParticle = i;
        return i;
      }
    }

    for (let i = 0; i < this.#lastUsedParticle; i++) {
      if (this.#particleIsDead(this.#particles[i])) {
        this.#lastUsedParticle = i;
        return i;
      }
    }
    // Override first particle if all others are alive;
    this.#lastUsedParticle = 0;
    return 0;
  }

  #respawnParticle(
    particle: Particle,
    gameObject: BreakoutGameObject,
    offset: vec2 = vec2.fromValues(0.0, 0.0)
  ) {
    const randomPositionOffset = randRange(-5.0, 5.0);
    const randomColour = randRange(0.5, 1.0);
    const newPosition = vec2.add(vec2.create(), gameObject.position, offset);
    vec2.add(newPosition, newPosition, vec2.fromValues(randomPositionOffset, randomPositionOffset));
    particle.position = newPosition;
    particle.lifetime = 1.0;
    particle.colour = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    vec2.scale(particle.velocity, particle.velocity, 0.1);
  }

  /** Render all particles */
  drawParticles(gl: WebGL2RenderingContext) {
    // Change blend mode to additive that gives a glow effect
    // when particles are stacked onto each other
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    this.#shader.use(gl);
    gl.bindVertexArray(this.#quadVertexArrayObject);
    this.#texture.bind(gl);

    for (const particle of this.#particles) {
      if (!this.#particleIsDead(particle)) {
        this.#shader.setUniform(gl, "offset", { type: "vec2", value: particle.position });
        this.#shader.setUniform(gl, "colour", { type: "vec4", value: particle.colour });
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }

    this.#shader.finishUse(gl);
    gl.bindVertexArray(null);
    this.#texture.unbind(gl);

    // Revert the blend mode to the default
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  killAllParticles() {
    for (const particle of this.#particles) {
      particle.lifetime = 0;
    }
    this.#lastUsedParticle = 0;
  }

  /** Update all particle attributes */
  update(
    dt: number,
    gameObject: BreakoutGameObject,
    offset: vec2 = vec2.fromValues(0.0, 0.0),
    newParticles: number = NUMBER_OF_NEW_PARTICLES_PER_FRAME
  ) {
    // 'Add' new particles by reusing dead particles
    for (let i = 0; i < newParticles; i++) {
      const unusedParticle = this.#firstUnusedParticle();
      this.#respawnParticle(this.#particles[unusedParticle], gameObject, offset);
    }

    // Update all particles
    for (const particle of this.#particles) {
      particle.lifetime -= dt;
      if (!this.#particleIsDead(particle)) {
        const positionOffset = vec2.scale(vec2.create(), particle.velocity, dt);
        vec2.sub(particle.position, particle.position, positionOffset);
        // The alpha component of the colour
        particle.colour[3] -= dt * 2.5;
      }
    }
  }
}
