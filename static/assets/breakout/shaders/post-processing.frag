#version 300 es
// For a 3x3 kernel matrix
#define TOTAL_KERNEL_ELEMENTS 9
precision highp float;

struct BreakoutEffects {
    bool shake;
    // Used in vertex shader only for the `shake` effect
    float shakeStrength;
};

in vec2 fragmentTextureCoord;

out vec4 fragmentColour;

// Sampler for the game scene rendered to a 2D texture
uniform sampler2D gameScene;

uniform BreakoutEffects effects;
// For kernel-based effects (blur and edge-detection)
uniform vec2 kernelOffsets[TOTAL_KERNEL_ELEMENTS];
uniform float blurKernel[TOTAL_KERNEL_ELEMENTS];

vec3[TOTAL_KERNEL_ELEMENTS] getSamplesFromKernelOffsets() {
    vec3 samples[TOTAL_KERNEL_ELEMENTS];
    for(int i = 0; i < TOTAL_KERNEL_ELEMENTS; i++) {
        samples[i] = vec3(texture(gameScene, fragmentTextureCoord.st + kernelOffsets[i]));
    }
    return samples;
}

/** Fragment shader part of the `shake` effect. Blurs the fragments of the screen texture a little.*/
void boxBlur(vec3[TOTAL_KERNEL_ELEMENTS] samples) {
    for(int i = 0; i < TOTAL_KERNEL_ELEMENTS; i++) {
        fragmentColour += vec4(samples[i] * blurKernel[i], 0.0f);
    }
    fragmentColour.a = 1.0f;
}

void main() {
    fragmentColour = vec4(0.0f);
    if(effects.shake) {
        vec3[TOTAL_KERNEL_ELEMENTS] samples = getSamplesFromKernelOffsets();
        boxBlur(samples);
    } else {
        fragmentColour = texture(gameScene, fragmentTextureCoord);
    }
}
