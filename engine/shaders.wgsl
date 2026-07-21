
// Particle Data Structure (16-byte aligned for WebGPU)
struct Particle {
    position : vec3<f32>,
    mass     : f32,
    velocity : vec3<f32>,
    padding  : f32, // Maintains 16-byte alignment
};

struct SimulationParams {
    delta_time     : f32,
    gravity_const  : f32,
    expansion_rate : f32, // Hubble expansion factor H(t)
    speed_of_light : f32, // Speed of causality c
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : SimulationParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&particles)) {
        return;
    }

    var pos = particles[index].position;
    var vel = particles[index].velocity;
    var accel = vec3<f32>(0.0, 0.0, 0.0);

    // 1. Calculate N-body Gravity across neighboring particles
    // (Sampled grid step for 500k performance optimization)
    let total_nodes = arrayLength(&particles);
    let step_size = u32(max(1.0, f32(total_nodes) / 256.0));

    for (var i : u32 = 0u; i < total_nodes; i += step_size) {
        if (i == index) {
            continue;
        }

        let other_pos = particles[i].position;
        let other_mass = particles[i].mass;

        let delta = other_pos - pos;
        let dist_sq = dot(delta, delta) + 0.1; // Softening parameter to prevent division by zero
        let dist = sqrt(dist_sq);

        // Apply realistic inverse-square gravity
        let force = (params.gravity_const * other_mass) / dist_sq;
        accel += normalize(delta) * force;
    }

    // 2. Apply Speed of Causality Limit (Velocity capped at speed of light 'c')
    vel += accel * params.delta_time;
    let current_speed = length(vel);
    if (current_speed > params.speed_of_light) {
        vel = normalize(vel) * params.speed_of_light;
    }

    // 3. Apply Cosmic Spatial Expansion: v_expansion = H(t) * position
    let expansion_vector = pos * (params.expansion_rate * 0.0001);
    pos += (vel + expansion_vector) * params.delta_time;

    // Save updated particle back to GPU memory
    particles[index].position = pos;
    particles[index].velocity = vel;
}
