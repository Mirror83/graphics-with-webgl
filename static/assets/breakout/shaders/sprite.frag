#version 300 es
precision highp float;

in vec2 fragmentTextureCoord;

out vec4 fragmentColour;

uniform sampler2D spriteImage;
uniform vec4 spriteColour;

void main() {
    fragmentColour = spriteColour * texture(spriteImage, fragmentTextureCoord);
}