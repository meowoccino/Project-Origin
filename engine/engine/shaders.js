export const shaderCode = /* wgsl */ `
struct Particle {
    position : vec3<f32>,
    mass : f32,
    velocity : vec3<f32>,
    charge : f32,
    net_force : vec3<f32>,
    entropy_decay : f32,
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
    zoom_level : f32,
    rot_x : f32,
    rot_y : f32,
    aspect_ratio : f32,
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : CosmicParams;

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

    let primordial_radius = 12.0 * noise_factor + 0.5;
    particles[index].position = random_dir * primordial_radius;

    let expansion_speed = 15.0 + (noise_factor * 10.0);
    particles[index].velocity = random_dir * expansion_speed;

    if (noise_factor > 0.15) {
        particles[index].mass = 50.0 * noise_factor;
        particles[index].charge = 0.0;
        particles[index].composition = 0u;
        particles[index].scale_radius = 0.1;
    } else {
        particles[index].mass = 5.0 * noise_factor;
        particles[index].charge = hash31(seed + 200.0).x * 0.5;
        particles[index].composition = 1u;
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
    let epsilon_sq: f32 = 2.0;

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

// --- 3. RENDER: VERTEX SHADER WITH TOUCH CAMERA TRANSFORM ---
struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_index : u32) -> VertexOutput {
    var out: VertexOutput;
    let p = particles[vertex_index];

    let cx = cos(params.rot_x);
    let sx = sin(params.rot_x);
    let cy = cos(params.rot_y);
    let sy = sin(params.rot_y);

    var pos = vec3<f32>(
        p.position.x * cy + p.position.z * sy,
        p.position.y,
        -p.position.x * sy + p.position.z * cy
    );

    pos = vec3<f32>(
        pos.x,
        pos.y * cx - pos.z * sx,
        pos.y * sx + pos.z * cx
    );

    let camera_dist = 100.0 / max(params.zoom_level, 0.01);
    let depth = pos.z + camera_dist;
    let proj = 1.8 / max(depth, 0.1);

    out.position = vec4<f32>(
        (pos.x * proj) / params.aspect_ratio,
        pos.y * proj,
        clamp(pos.z * 0.001, 0.0, 1.0),
        1.0
    );

    if (p.composition == 0u) {
        out.color = vec4<f32>(0.65, 0.3, 1.0, 0.45);
    } else if (p.composition == 1u) {
        out.color = vec4<f32>(0.3, 0.9, 1.0, 0.95);
    } else {
        out.color = vec4<f32>(1.0, 0.75, 0.3, 1.0);
    }

    return out;
}

// --- 4. RENDER: FRAGMENT SHADER ---
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return in.color;
}
`;
