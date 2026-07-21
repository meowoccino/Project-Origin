// ============================================================================
// PROJECT ORIGIN: PHYSICAL UNIVERSE COMPUTE & RENDER SHADER
// Features: 8 Physical Attributes + Gravity + 3D Perspective Particle Rendering
// ============================================================================

struct Particle {
    // 1. Position (x, y, z) & 3. Mass
    position : vec3<f32>,
    mass : f32,

    // 2. Velocity (vx, vy, vz) & 4. Charge
    velocity : vec3<f32>,
    charge : f32,

    // 8. Net Force Vector & 7. Entropy / Decay
    net_force : vec3<f32>,
    entropy_decay : f32,

    // 5. Scale / Radius & 6. Composition & Alignment Padding
    scale_radius : f32,
    composition : u32,      // 0 = Dark Matter, 1 = Hydrogen Gas, 2 = Stellar Metal
    pad1 : f32,
    pad2 : f32,
};

struct CosmicParams {
    cosmic_age_myr : f32,
    expansion_rate_h : f32,
    delta_time : f32,
    particle_count : u32,
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : CosmicParams;

// Pseudo-Random Generator
fn hash31(p: f32) -> vec3<f32> {
    var p3 = fract(vec3<f32>(p * 0.1031, p * 0.1030, p * 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx) * 2.0 - 1.0;
}

// --- 1. COMPUTE: BIG BANG INITIALIZATION ---
@compute @workgroup_size(256)
fn init_big_bang(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particle_count) { return; }

    let seed = f32(index);
    let random_dir = normalize(hash31(seed));
    let noise_factor = length(hash31(seed + 100.0));

    let primordial_radius = 0.05 * noise_factor;
    particles[index].position = random_dir * primordial_radius;

    let expansion_speed = 40.0 + (noise_factor * 20.0);
    particles[index].velocity = random_dir * expansion_speed;

    if (noise_factor > 0.15) {
        particles[index].mass = 50.0 * noise_factor;
        particles[index].charge = 0.0;
        particles[index].composition = 0u; // Dark Matter
        particles[index].scale_radius = 0.1;
    } else {
        particles[index].mass = 5.0 * noise_factor;
        particles[index].charge = hash31(seed + 200.0).x * 0.5;
        particles[index].composition = 1u; // Hydrogen Gas
        particles[index].scale_radius = 0.5;
    }

    particles[index].net_force = vec3<f32>(0.0);
    particles[index].entropy_decay = 0.01;
}

// --- 2. COMPUTE: REALTIME PHYSICS LOOP ---
@compute @workgroup_size(256)
fn update_physics(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particle_count) { return; }

    var p = particles[index];
    let dt = params.delta_time;
    let G: f32 = 0.15;
    let epsilon_sq: f32 = 1.0;

    var accumulated_force = vec3<f32>(0.0);

    let sample_stride = 128u; 
    let max_samples = min(params.particle_count, 1024u);

    for (var i = 0u; i < max_samples; i += sample_stride) {
        let neighbor_idx = (index + i + 1u) % params.particle_count;
        let other = particles[neighbor_idx];

        let r_vec = other.position - p.position;
        let dist_sq = dot(r_vec, r_vec);

        let force_mag = (G * p.mass * other.mass) / (dist_sq + epsilon_sq);
        let force_dir = normalize(r_vec + vec3<f32>(0.0001));

        accumulated_force += force_dir * force_mag;
    }

    p.net_force += accumulated_force;

    let acceleration = p.net_force / max(p.mass, 0.001);
    p.velocity += acceleration * dt;

    let hubble_vector = p.position * (params.expansion_rate_h * 0.0001 * dt);
    p.position += (p.velocity * dt) + hubble_vector;

    p.entropy_decay = min(p.entropy_decay + (0.0001 * dt), 1.0);
    p.net_force = vec3<f32>(0.0);

    particles[index] = p;
}

// --- 3. RENDER: VERTEX SHADER ---
struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_index : u32) -> VertexOutput {
    var out: VertexOutput;
    let p = particles[vertex_index];

    // Simple 3D perspective projection onto 2D viewport
    let zoom: f32 = 0.015;
    let camera_z: f32 = 50.0;
    
    let world_pos = p.position * zoom;
    let depth = world_pos.z + camera_z;

    // Perspective divide (farthest particles appear smaller/closer to center)
    let perspective_scale = 1.5 / max(depth, 0.1);

    out.position = vec4<f32>(
        world_pos.x * perspective_scale,
        world_pos.y * perspective_scale,
        clamp(world_pos.z * 0.001, 0.0, 1.0),
        1.0
    );

    // Dynamic color based on particle composition & entropy
    if (p.composition == 0u) {
        // Dark Matter Node: Subtle violet glow
        out.color = vec4<f32>(0.5, 0.2, 0.9, 0.35);
    } else if (p.composition == 1u) {
        // Hydrogen Gas: Cyan star core
        out.color = vec4<f32>(0.2, 0.85, 1.0, 0.85);
    } else {
        // Stellar Metal: Warm gold flare
        out.color = vec4<f32>(1.0, 0.65, 0.2, 0.95);
    }

    return out;
}

// --- 4. RENDER: FRAGMENT SHADER ---
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return in.color;
}
