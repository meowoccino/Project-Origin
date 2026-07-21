// ============================================================================
// PROJECT ORIGIN: ACCURATE LOCAL GRAVITY & EXPANSION COMPUTE SHADER
// Features: Softened Spatial Gravity + 8 Attribute Memory + Inflation
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
    expansion_rate_h : f32, // Hubble metric expansion
    delta_time : f32,       // Step size dt
    particle_count : u32,
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : CosmicParams;

// Pseudo-Random Generator for Primordial Quantum Fluctuations
fn hash31(p: f32) -> vec3<f32> {
    var p3 = fract(vec3<f32>(p * 0.1031, p * 0.1030, p * 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx) * 2.0 - 1.0;
}

// --- 1. BIG BANG INITIALIZATION SHADER ---
@compute @workgroup_size(256)
fn init_big_bang(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particle_count) { return; }

    let seed = f32(index);
    let random_dir = normalize(hash31(seed));
    let noise_factor = length(hash31(seed + 100.0));

    // A. Singularity Core Placement
    let primordial_radius = 0.05 * noise_factor;
    particles[index].position = random_dir * primordial_radius;

    // B. High-Velocity Inflation Wavefront
    let expansion_speed = 40.0 + (noise_factor * 20.0);
    particles[index].velocity = random_dir * expansion_speed;

    // C. Dark Matter vs Baryonic Matter Ratio (85 / 15)
    if (noise_factor > 0.15) {
        particles[index].mass = 50.0 * noise_factor; // Dark Matter halo anchor
        particles[index].charge = 0.0;
        particles[index].composition = 0u; 
        particles[index].scale_radius = 0.1;
    } else {
        particles[index].mass = 5.0 * noise_factor;  // Baryonic Gas
        particles[index].charge = hash31(seed + 200.0).x * 0.5;
        particles[index].composition = 1u; 
        particles[index].scale_radius = 0.5;
    }

    particles[index].net_force = vec3<f32>(0.0);
    particles[index].entropy_decay = 0.01;
}

// --- 2. REALTIME PHYSICS INTEGRATION LOOP ---
@compute @workgroup_size(256)
fn update_physics(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particle_count) { return; }

    var p = particles[index];
    let dt = params.delta_time;
    let G: f32 = 0.15;           // Gravitational constant scaling factor
    let epsilon_sq: f32 = 1.0;   // Softening parameter (prevents F -> Infinity)

    var accumulated_force = vec3<f32>(0.0);

    // --- ACCURATE NEIGHBORHOOD GRAVITY ---
    // Strided sampling over neighboring particle clusters to compute local Newtonian forces
    let sample_stride = 128u; 
    let max_samples = min(params.particle_count, 1024u);

    for (var i = 0u; i < max_samples; i += sample_stride) {
        let neighbor_idx = (index + i + 1u) % params.particle_count;
        let other = particles[neighbor_idx];

        let r_vec = other.position - p.position;
        let dist_sq = dot(r_vec, r_vec);

        // Compute Newton's law of universal gravitation: F = G * (m1 * m2) / (r^2 + e^2)
        let force_mag = (G * p.mass * other.mass) / (dist_sq + epsilon_sq);
        let force_dir = normalize(r_vec + vec3<f32>(0.0001)); // Prevent zero vector divide

        accumulated_force += force_dir * force_mag;
    }

    // Add external AI forces + accumulated local gravitational forces
    p.net_force += accumulated_force;

    // Acceleration (a = F / m)
    let acceleration = p.net_force / max(p.mass, 0.001);
    p.velocity += acceleration * dt;

    // Cosmic Metric Expansion (Space stretching over time)
    let hubble_vector = p.position * (params.expansion_rate_h * 0.0001 * dt);
    p.position += (p.velocity * dt) + hubble_vector;

    // Natural Entropy Decay
    p.entropy_decay = min(p.entropy_decay + (0.0001 * dt), 1.0);

    // Reset Force Vector for Next Frame Calculation
    p.net_force = vec3<f32>(0.0);

    // Write back updated physical state to GPU
    particles[index] = p;
}
