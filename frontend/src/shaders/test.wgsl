struct Uniforms {
    vp: mat4x4<f32>,
};

struct DirectionalLight {
    direction: vec3<f32>,
    _pad: f32,
    color: vec3<f32>,
    intensity: f32,
};

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(5) normal: vec3<f32>,
    @location(1) mvp0: vec4<f32>,
    @location(2) mvp1: vec4<f32>,
    @location(3) mvp2: vec4<f32>,
    @location(4) mvp3: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) clipPosition: vec4<f32>,
    @location(0) worldPos: vec3<f32>,
    @location(1) worldNormal: vec3<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> lights: array<DirectionalLight, 4>;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let m = mat4x4<f32>(input.mvp0, input.mvp1, input.mvp2, input.mvp3);
    let worldPos = m * vec4<f32>(input.position, 1.0);
    output.clipPosition = uniforms.vp * worldPos;
    output.worldPos = worldPos.xyz;
    output.worldNormal = normalize((m * vec4<f32>(input.normal, 0.0)).xyz);
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let baseColor = vec3<f32>(
        1,
        1,
        1,
    );

    let ambient = 0.15;
    var diffuse = vec3<f32>(0.0, 0.0, 0.0);

    for (var i = 0u; i < 4u; i++) {
        let light = lights[i];
        let contribution = max(
            dot(input.worldNormal, normalize(-light.direction)),
            0.0
        ) * light.intensity;
        diffuse += light.color * contribution;
    }


    return vec4<f32>(baseColor * (ambient + diffuse), 1.0);
}