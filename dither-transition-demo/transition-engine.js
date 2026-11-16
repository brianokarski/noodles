// WebGL Dithered Transition Engine

class DitherTransition {
    constructor(canvasId, imageA, imageB, shaderType) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl');
        
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }
        
        this.imageA = imageA;
        this.imageB = imageB;
        this.shaderType = shaderType;
        this.progress = 0;
        this.softness = 0.05;
        this.scale = 3;
        this.time = 0;
        
        this.init();
    }
    
    async init() {
        await this.loadImages();
        this.setupWebGL();
        this.render();
    }
    
    async loadImages() {
        this.imgA = await this.loadImage(this.imageA);
        this.imgB = await this.loadImage(this.imageB);
        
        // Set canvas size based on first image
        this.canvas.width = this.imgA.width;
        this.canvas.height = this.imgA.height;
    }
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    setupWebGL() {
        const gl = this.gl;
        
        // Vertex shader (same for all)
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        // Fragment shader based on type
        const fragmentShaderSource = this.getFragmentShader();
        
        // Compile shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            return;
        }
        
        // Setup geometry (full-screen quad)
        const positions = new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1, 1,   1, -1,   1, 1
        ]);
        
        const texCoords = new Float32Array([
            0, 1,  1, 1,  0, 0,
            0, 0,  1, 1,  1, 0
        ]);
        
        // Position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        
        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // TexCoord buffer
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        
        const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Create textures
        this.textureA = this.createTexture(this.imgA);
        this.textureB = this.createTexture(this.imgB);
        
        // Create noise texture
        this.noiseTexture = this.createNoiseTexture();
        
        // Get uniform locations
        this.uniforms = {
            imageA: gl.getUniformLocation(this.program, 'u_imageA'),
            imageB: gl.getUniformLocation(this.program, 'u_imageB'),
            noiseTexture: gl.getUniformLocation(this.program, 'u_noiseTexture'),
            progress: gl.getUniformLocation(this.program, 'u_progress'),
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            softness: gl.getUniformLocation(this.program, 'u_softness'),
            scale: gl.getUniformLocation(this.program, 'u_scale'),
            time: gl.getUniformLocation(this.program, 'u_time')
        };
    }
    
    getFragmentShader() {
        const shaders = {
            'basic': `
                precision mediump float;
                uniform sampler2D u_imageA;
                uniform sampler2D u_imageB;
                uniform sampler2D u_noiseTexture;
                uniform float u_progress;
                varying vec2 v_texCoord;
                
                void main() {
                    float noise = texture2D(u_noiseTexture, v_texCoord).r;
                    float threshold = step(u_progress, noise);
                    
                    vec4 colorA = texture2D(u_imageA, v_texCoord);
                    vec4 colorB = texture2D(u_imageB, v_texCoord);
                    
                    gl_FragColor = mix(colorB, colorA, threshold);
                }
            `,
            
            'bluenoise': `
                precision mediump float;
                uniform sampler2D u_imageA;
                uniform sampler2D u_imageB;
                uniform sampler2D u_noiseTexture;
                uniform float u_progress;
                uniform vec2 u_resolution;
                varying vec2 v_texCoord;
                
                // Simple blue noise approximation using multiple scales
                float blueNoise(vec2 coord) {
                    vec2 uv1 = coord * 1.0;
                    vec2 uv2 = coord * 2.5;
                    vec2 uv3 = coord * 6.7;
                    
                    float n1 = texture2D(u_noiseTexture, uv1).r;
                    float n2 = texture2D(u_noiseTexture, uv2).g;
                    float n3 = texture2D(u_noiseTexture, uv3).b;
                    
                    return fract(n1 + n2 * 0.5 + n3 * 0.25);
                }
                
                void main() {
                    float noise = blueNoise(v_texCoord);
                    float threshold = step(u_progress, noise);
                    
                    vec4 colorA = texture2D(u_imageA, v_texCoord);
                    vec4 colorB = texture2D(u_imageB, v_texCoord);
                    
                    gl_FragColor = mix(colorB, colorA, threshold);
                }
            `,
            
            'ordered': `
                precision mediump float;
                uniform sampler2D u_imageA;
                uniform sampler2D u_imageB;
                uniform float u_progress;
                uniform vec2 u_resolution;
                varying vec2 v_texCoord;
                
                // 8x8 Bayer matrix
                float bayer8(vec2 coord) {
                    mat4 m1 = mat4(
                        0.0,  32.0,  8.0,  40.0,
                        48.0, 16.0,  56.0, 24.0,
                        12.0, 44.0,  4.0,  36.0,
                        60.0, 28.0,  52.0, 20.0
                    );
                    mat4 m2 = mat4(
                        3.0,  35.0,  11.0, 43.0,
                        51.0, 19.0,  59.0, 27.0,
                        15.0, 47.0,  7.0,  39.0,
                        63.0, 31.0,  55.0, 23.0
                    );
                    
                    ivec2 p = ivec2(mod(coord * u_resolution, 8.0));
                    float value;
                    
                    if (p.y < 4) {
                        if (p.x < 4) value = m1[p.y][p.x];
                        else value = m2[p.y][p.x - 4];
                    } else {
                        if (p.x < 4) value = m1[p.y - 4][p.x];
                        else value = m2[p.y - 4][p.x - 4];
                    }
                    
                    return value / 64.0;
                }
                
                void main() {
                    float noise = bayer8(v_texCoord);
                    float threshold = step(u_progress, noise);
                    
                    vec4 colorA = texture2D(u_imageA, v_texCoord);
                    vec4 colorB = texture2D(u_imageB, v_texCoord);
                    
                    gl_FragColor = mix(colorB, colorA, threshold);
                }
            `,
            
            'soft': `
                precision mediump float;
                uniform sampler2D u_imageA;
                uniform sampler2D u_imageB;
                uniform sampler2D u_noiseTexture;
                uniform float u_progress;
                uniform float u_softness;
                varying vec2 v_texCoord;
                
                float smoothstep_custom(float edge0, float edge1, float x) {
                    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
                    return t * t * (3.0 - 2.0 * t);
                }
                
                void main() {
                    float noise = texture2D(u_noiseTexture, v_texCoord).r;
                    float mixValue = smoothstep_custom(u_progress - u_softness, u_progress + u_softness, noise);
                    
                    vec4 colorA = texture2D(u_imageA, v_texCoord);
                    vec4 colorB = texture2D(u_imageB, v_texCoord);
                    
                    gl_FragColor = mix(colorA, colorB, mixValue);
                }
            `,
            
            'perlin': `
                precision mediump float;
                uniform sampler2D u_imageA;
                uniform sampler2D u_imageB;
                uniform float u_progress;
                uniform float u_scale;
                varying vec2 v_texCoord;
                
                // Simplified 2D noise
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }
                
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    
                    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
                }
                
                float perlin(vec2 p) {
                    float total = 0.0;
                    float frequency = 1.0;
                    float amplitude = 1.0;
                    float maxValue = 0.0;
                    
                    for(int i = 0; i < 4; i++) {
                        total += noise(p * frequency) * amplitude;
                        maxValue += amplitude;
                        amplitude *= 0.5;
                        frequency *= 2.0;
                    }
                    
                    return total / maxValue;
                }
                
                void main() {
                    float n = perlin(v_texCoord * u_scale);
                    float threshold = step(u_progress, n);
                    
                    vec4 colorA = texture2D(u_imageA, v_texCoord);
                    vec4 colorB = texture2D(u_imageB, v_texCoord);
                    
                    gl_FragColor = mix(colorB, colorA, threshold);
                }
            `,
            
            'animated': `
                precision mediump float;
                uniform sampler2D u_imageA;
                uniform sampler2D u_imageB;
                uniform sampler2D u_noiseTexture;
                uniform float u_progress;
                uniform float u_time;
                varying vec2 v_texCoord;
                
                float animatedNoise(vec2 coord, float time) {
                    vec2 offset = vec2(sin(time * 0.5), cos(time * 0.7)) * 0.1;
                    float n1 = texture2D(u_noiseTexture, coord + offset).r;
                    float n2 = texture2D(u_noiseTexture, coord * 1.5 - offset * 0.5).g;
                    return fract(n1 + n2 * sin(time) * 0.1);
                }
                
                void main() {
                    float noise = animatedNoise(v_texCoord, u_time);
                    float threshold = step(u_progress, noise);
                    
                    vec4 colorA = texture2D(u_imageA, v_texCoord);
                    vec4 colorB = texture2D(u_imageB, v_texCoord);
                    
                    gl_FragColor = mix(colorB, colorA, threshold);
                }
            `
        };
        
        return shaders[this.shaderType] || shaders['basic'];
    }
    
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createTexture(image) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        return texture;
    }
    
    createNoiseTexture() {
        const gl = this.gl;
        const size = 512;
        const data = new Uint8Array(size * size * 4);
        
        for (let i = 0; i < size * size; i++) {
            const idx = i * 4;
            data[idx] = Math.random() * 255;     // R
            data[idx + 1] = Math.random() * 255; // G
            data[idx + 2] = Math.random() * 255; // B
            data[idx + 3] = 255;                 // A
        }
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        
        return texture;
    }
    
    setProgress(value) {
        this.progress = value;
        this.render();
    }
    
    setSoftness(value) {
        this.softness = value;
        this.render();
    }
    
    setScale(value) {
        this.scale = value;
        this.render();
    }
    
    render() {
        const gl = this.gl;
        
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(this.program);
        
        // Bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureA);
        gl.uniform1i(this.uniforms.imageA, 0);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureB);
        gl.uniform1i(this.uniforms.imageB, 1);
        
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.uniform1i(this.uniforms.noiseTexture, 2);
        
        // Set uniforms
        gl.uniform1f(this.uniforms.progress, this.progress);
        gl.uniform2f(this.uniforms.resolution, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(this.uniforms.softness, this.softness);
        gl.uniform1f(this.uniforms.scale, this.scale);
        gl.uniform1f(this.uniforms.time, this.time);
        
        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    animate(duration = 2000) {
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            this.progress = progress;
            this.time = elapsed / 1000;
            this.render();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
}

// Initialize all demos when page loads
window.addEventListener('DOMContentLoaded', () => {
    // Use the provided images
    const imageA = 'Image1.jpg';
    const imageB = 'Image2.jpg';
    
    const demos = [
        { id: 1, type: 'basic' },
        { id: 2, type: 'bluenoise' },
        { id: 3, type: 'ordered' },
        { id: 4, type: 'soft' },
        { id: 5, type: 'perlin' },
        { id: 6, type: 'animated' }
    ];
    
    demos.forEach(demo => {
        const transition = new DitherTransition(`canvas${demo.id}`, imageA, imageB, demo.type);
        
        // Progress slider
        const progressSlider = document.getElementById(`progress${demo.id}`);
        const progressValue = document.getElementById(`value${demo.id}`);
        progressSlider.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            transition.setProgress(val);
            progressValue.textContent = `${e.target.value}%`;
        });
        
        // Softness slider (demo 4)
        if (demo.id === 4) {
            const softnessSlider = document.getElementById(`softness${demo.id}`);
            const softnessValue = document.getElementById(`softValue${demo.id}`);
            softnessSlider.addEventListener('input', (e) => {
                const val = e.target.value / 100;
                transition.setSoftness(val);
                softnessValue.textContent = e.target.value;
            });
        }
        
        // Scale slider (demo 5)
        if (demo.id === 5) {
            const scaleSlider = document.getElementById(`scale${demo.id}`);
            const scaleValue = document.getElementById(`scaleValue${demo.id}`);
            scaleSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                transition.setScale(val);
                scaleValue.textContent = e.target.value;
            });
        }
        
        // Animate button
        const animateBtn = document.getElementById(`animate${demo.id}`);
        animateBtn.addEventListener('click', () => {
            progressSlider.value = 0;
            progressValue.textContent = '0%';
            transition.animate(3000);
            
            // Update slider during animation
            const updateSlider = () => {
                progressSlider.value = transition.progress * 100;
                progressValue.textContent = `${Math.round(transition.progress * 100)}%`;
                if (transition.progress < 1) {
                    requestAnimationFrame(updateSlider);
                }
            };
            requestAnimationFrame(updateSlider);
        });
    });
});
