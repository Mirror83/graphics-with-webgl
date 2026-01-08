#version 300 es

in vec2 position;
in vec2 texCoord;

out vec2 vertexTexCoord;

void main() {
    gl_Position = vec4(position, 0.0f, 1.0f);
    vertexTexCoord = texCoord;
}