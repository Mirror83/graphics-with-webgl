#version 300 es

in vec2 position;
in vec3 colour;

out vec4 vertexColour;

void main() {
    gl_Position = vec4(position, 0.0f, 1.0f);
    vertexColour = vec4(colour, 1.0f);
}