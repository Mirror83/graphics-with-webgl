#version 300 es

struct BreakoutEffects {
    bool shake;
    float shakeStrength;
};

// <vec2 position, vec2 textureCoord>
layout(location = 0) in vec4 vertexAndTextureCoords;

out vec2 fragmentTextureCoord;

uniform BreakoutEffects effects;
uniform float timeInSeconds;

/** Vertex shader part of the `shake` effect. Slightly displaces the vertices of the screen texture quad. */
void displacePosition() {
    gl_Position.x += cos(timeInSeconds * 10.0f) * effects.shakeStrength;
    gl_Position.y += cos(timeInSeconds * 15.0f) * effects.shakeStrength;
}

void main() {
    gl_Position = vec4(vertexAndTextureCoords.xy, 0.0f, 1.0f);
    vec2 textureCoord = vertexAndTextureCoords.zw;
    fragmentTextureCoord = textureCoord;

    if(effects.shake) {
        displacePosition();
    }
}
