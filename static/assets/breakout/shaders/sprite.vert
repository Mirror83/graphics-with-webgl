#version 300 es

// The position is stored in the x and y components while 
// the texture coordinates are stored in the z and w components
layout(location = 0) in vec4 positionAndTextureCoord;

out vec2 fragmentTextureCoord;

uniform mat4 projection;
uniform mat4 model;

void main() {
    vec2 position = positionAndTextureCoord.xy;
    vec2 textureCoord = positionAndTextureCoord.zw;

    gl_Position = projection * model * vec4(position, 0.0f, 1.0f);
    fragmentTextureCoord = textureCoord;
}