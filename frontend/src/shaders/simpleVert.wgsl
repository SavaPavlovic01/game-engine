struct Uniforms {
    vp: mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) mvp0: vec4<f32>,
    @location(2) mvp1: vec4<f32>,
    @location(3) mvp2: vec4<f32>,
    @location(4) mvp3: vec4<f32>,

};

struct VertexOutput {
    @builtin(position) clipPosition: vec4<f32>,
    @location(0) worldPos: vec3<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let m = mat4x4<f32>(input.mvp0,input.mvp1,input.mvp2,input.mvp3);

    let worldPos = vec4<f32>(input.position, 1.0);

    output.clipPosition = uniforms.vp * m * worldPos;
    output.worldPos = input.position;

    return output;
}