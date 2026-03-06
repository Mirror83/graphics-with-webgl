#version 300 es

struct BreakoutEffects {
    bool shake;
    float shakeStrength;

    bool chaos;
    float chaosStrength;

    bool confuse;
};

// <vec2 position, vec2 textureCoord>
layout(location = 0) in vec4 vertexAndTextureCoords;

out vec2 fragmentTextureCoord;

uniform BreakoutEffects effects;
uniform float timeInSeconds;

/** Vertex shader part of the `shake` effect. Slightly displaces the vertices of the screen texture quad. */
void displaceVertexPosition() {
    gl_Position.x += cos(timeInSeconds * 10.0f) * effects.shakeStrength;
    gl_Position.y += cos(timeInSeconds * 15.0f) * effects.shakeStrength;
}

/** Vertex shader part of the `confuse` effect. Inverts the fragment texture coordinates. */
void flipTextureCoord(vec2 textureCoord) {
    fragmentTextureCoord = vec2(1.0f - textureCoord.x, 1.0f - textureCoord.y);
}

/** Vertex shader part of the `chaos` effect. Moves the texture coordinates in a circle. */
void translateTextureCoordCircular(vec2 textureCoord) {
    vec2 newCoord = vec2(textureCoord.x + sin(timeInSeconds) * effects.chaosStrength, textureCoord.y + cos(timeInSeconds) * effects.chaosStrength);
    fragmentTextureCoord = newCoord;
}

void main() {
    gl_Position = vec4(vertexAndTextureCoords.xy, 0.0f, 1.0f);
    vec2 rawTextureCoord = vertexAndTextureCoords.zw;

    if(effects.shake) {
        displaceVertexPosition();
    }

    if(effects.confuse) {
        flipTextureCoord(rawTextureCoord);
    } else if(effects.chaos) {
        translateTextureCoordCircular(rawTextureCoord);
    } else {
        fragmentTextureCoord = rawTextureCoord;
    }
}
