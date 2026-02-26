#version 300 es
precision highp float;

struct Material {
    // Texture to be used for diffuse colours of the object
    sampler2D diffuse0;
    sampler2D specular0;
};

in vec2 textureFragmentCoord;

out vec4 fragmentColour;

uniform Material material;

void main() {
    float mixAmount = 0.0f;
    fragmentColour = mix(texture(material.diffuse0, textureFragmentCoord), texture(material.specular0, textureFragmentCoord), clamp(mixAmount, 0.0f, 1.0f));
}