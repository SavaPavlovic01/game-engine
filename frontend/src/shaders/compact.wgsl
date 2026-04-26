struct Instance {
    model: mat4x4<f32>,  
    alive: u32,         
    pad0: u32,          
    pad1: u32,          
    pad2: u32,          
}      

struct DrawArgs {
    indexCount: u32,
    instanceCount: atomic<u32>,
    firstIndex: u32,
    baseVertex: u32,
    firstInstance: u32,
}

@group(0) @binding(0) var<storage, read> instances: array<Instance>;
@group(0) @binding(1) var<storage, read_write> cleanBuffer: array<mat4x4<f32>>;
@group(0) @binding(2) var<storage, read_write> drawArgs: DrawArgs;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if i >= 10000u { return; }

    if instances[i].alive == 1u {
        let slot = atomicAdd(&drawArgs.instanceCount, 1u);
        cleanBuffer[slot] = instances[i].model;
    }
}