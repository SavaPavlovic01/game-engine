struct Uniforms {
    vp: mat4x4<f32>,
};

struct DirectionalLight {
    direction: vec3<f32>,
    _pad: f32,
    color: vec3<f32>,
    intensity: f32,
};

struct PointLight {
    position: vec3<f32>,
    radius: f32,
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
@group(0) @binding(1) var<uniform> directionalLights: array<DirectionalLight, 4>;
@group(0) @binding(2) var<uniform> pointLights: array<PointLight, 16>;

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
    let baseColor = vec3<f32>(0.8, 0.8, 0.8);
    let normal = normalize(input.worldNormal);

    let ambient = 0.15;
    var diffuse = vec3<f32>(0.0);

    for (var i = 0u; i < 4u; i++) {
        let light = directionalLights[i];
        let contribution = max(dot(normal, normalize(-light.direction)), 0.0) * light.intensity;
        diffuse += light.color * contribution;
    }

    for (var i = 0u; i < 16u; i++) {
        let light = pointLights[i];
        let toLight = light.position - input.worldPos;
        let dist = length(toLight);

        if dist > light.radius { continue; }

        let attenuation = 1.0 - (dist / light.radius);

        let contribution = max(dot(normal, normalize(toLight)), 0.0) 
            * light.intensity 
            * attenuation;
        diffuse += light.color * contribution;
    }

    return vec4<f32>(baseColor * (ambient + diffuse), 1.0);
}