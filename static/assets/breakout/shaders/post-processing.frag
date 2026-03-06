#version 300 es
// For a 3x3 kernel matrix
#define TOTAL_KERNEL_ELEMENTS 9
// #define CONVOLUTION_MATRIX float[TOTAL_KERNEL_ELEMENTS]
// #define KERNEL_SAMPLES vec3[TOTAL_KERNEL_ELEMENTS]
precision highp float;

struct BreakoutEffects {
    bool shake;
    float shakeStrength; // Used only in vertex shader

    bool chaos;
    float chaosStrength; // Used only in vertex shader

    bool confuse;
};

in vec2 fragmentTextureCoord;

out vec4 fragmentColour;

// Sampler for the game scene rendered to a 2D texture
uniform sampler2D gameScene;

uniform BreakoutEffects effects;
// For kernel-based effects (blur and edge-detection)
uniform vec2 kernelOffsets[TOTAL_KERNEL_ELEMENTS];

uniform float blurKernel[TOTAL_KERNEL_ELEMENTS];
uniform float edgeDetectionKernel[TOTAL_KERNEL_ELEMENTS];

vec3[TOTAL_KERNEL_ELEMENTS] getSamplesFromKernelOffsets() {
    vec3 samples[TOTAL_KERNEL_ELEMENTS];
    for(int i = 0; i < TOTAL_KERNEL_ELEMENTS; i++) {
        samples[i] = vec3(texture(gameScene, fragmentTextureCoord.st + kernelOffsets[i]));
    }
    return samples;
}

void convolveFragmentColour(vec3[TOTAL_KERNEL_ELEMENTS] samples, float[TOTAL_KERNEL_ELEMENTS] convolutionKernel) {
    for(int i = 0; i < TOTAL_KERNEL_ELEMENTS; i++) {
        fragmentColour += vec4(samples[i] * convolutionKernel[i], 0.0f);
    }
    fragmentColour.a = 1.0f;
}

/** Fragment shader part of the `shake` effect. Blurs the fragments of the screen texture a little.*/
void boxBlur(vec3[TOTAL_KERNEL_ELEMENTS] samples) {
    convolveFragmentColour(samples, blurKernel);
}

/** Fragment shader part of the `chaos` effect. Convolves fragment colours with edge-detection kernel. */
void edgeDetection(vec3[TOTAL_KERNEL_ELEMENTS] samples) {
    convolveFragmentColour(samples, edgeDetectionKernel);
}

/** Fragment shader part of the `confuse` effect. Inverts the colours of the scene. */
void invertFragmentColour() {
    fragmentColour = vec4(1.0f - texture(gameScene, fragmentTextureCoord).rgb, 1.0f);
}

void main() {
    fragmentColour = vec4(0.0f);
    vec3 samples[TOTAL_KERNEL_ELEMENTS];
    if(effects.shake || effects.chaos) {
        samples = getSamplesFromKernelOffsets();
    }
    if(effects.chaos) {
        edgeDetection(samples);
    } else if(effects.confuse) {
        invertFragmentColour();
    } else if(effects.shake) {
        boxBlur(samples);
    } else {
        fragmentColour = texture(gameScene, fragmentTextureCoord);
    }
}
