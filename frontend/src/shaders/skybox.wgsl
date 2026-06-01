struct ViewProjection {
    vp: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> vp: ViewProjection;
@group(1) @binding(0) var skyTexture: texture_cube<f32>;
@group(1) @binding(1) var skySampler: sampler;

struct VertexOut {
    @builtin(position) position: vec4<f32>,
    @location(0) localPos: vec3<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertIndex: u32) -> VertexOut {
    var positions = array<vec3<f32>, 36>(
        vec3(-1.0, -1.0, -1.0), vec3( 1.0,  1.0, -1.0), vec3( 1.0, -1.0, -1.0),
        vec3( 1.0,  1.0, -1.0), vec3(-1.0, -1.0, -1.0), vec3(-1.0,  1.0, -1.0),
        vec3(-1.0, -1.0,  1.0), vec3( 1.0, -1.0,  1.0), vec3( 1.0,  1.0,  1.0),
        vec3( 1.0,  1.0,  1.0), vec3(-1.0,  1.0,  1.0), vec3(-1.0, -1.0,  1.0),
        vec3(-1.0,  1.0,  1.0), vec3(-1.0,  1.0, -1.0), vec3(-1.0, -1.0, -1.0),
        vec3(-1.0, -1.0, -1.0), vec3(-1.0, -1.0,  1.0), vec3(-1.0,  1.0,  1.0),
        vec3( 1.0,  1.0, -1.0), vec3( 1.0,  1.0,  1.0), vec3( 1.0, -1.0,  1.0),
        vec3( 1.0, -1.0,  1.0), vec3( 1.0, -1.0, -1.0), vec3( 1.0,  1.0, -1.0),
        vec3(-1.0, -1.0, -1.0), vec3( 1.0, -1.0, -1.0), vec3( 1.0, -1.0,  1.0),
        vec3( 1.0, -1.0,  1.0), vec3(-1.0, -1.0,  1.0), vec3(-1.0, -1.0, -1.0),
        vec3(-1.0,  1.0, -1.0), vec3( 1.0,  1.0,  1.0), vec3( 1.0,  1.0, -1.0),
        vec3(-1.0,  1.0, -1.0), vec3(-1.0,  1.0,  1.0), vec3( 1.0,  1.0,  1.0),
    );

    let pos = positions[vertIndex];
    var out: VertexOut;
    out.localPos = pos;

    var rotVP = vp.vp;
    rotVP[3] = vec4(0.0, 0.0, 0.0, 1.0);

    let clip = rotVP * vec4(pos, 1.0);
    out.position = clip.xyww;
    return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
    return textureSample(skyTexture, skySampler, in.localPos);
}