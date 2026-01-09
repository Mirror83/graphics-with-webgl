#version 300 es
in vec2 position;
in vec3 colour;
in vec2 texCoord;

out vec3 vertexColour;
out vec2 vertexTexCoord;

void main() {
    gl_Position = vec4(position, 0.0f, 1.0f);
    vertexColour = colour;
    vertexTexCoord = texCoord;
}