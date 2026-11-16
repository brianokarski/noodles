// Three.js Dithered Transition Example
// To use: npm install three gsap
// Then: npx vite (or import this in your project)

import * as THREE from 'three';
import gsap from 'gsap';

class DitheredTransition {
  constructor(container, imageA, imageB) {
    this.container = container;
    this.imageA = imageA;
    this.imageB = imageB;
    
    this.init();
  }
  
  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);
    
    // Load textures
    const loader = new THREE.TextureLoader();
    
    Promise.all([
      loader.loadAsync(this.imageA),
      loader.loadAsync(this.imageB)
    ]).then(([texA, texB]) => {
      this.textureA = texA;
      this.textureB = texB;
      this.createMaterial();
      this.createMesh();
      this.animate();
    });
  }
  
  createMaterial() {
    // Dithered transition shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuseA: { value: this.textureA },
        tDiffuseB: { value: this.textureB },
        progress: { value: 0.0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      
      fragmentShader: `
        uniform sampler2D tDiffuseA;
        uniform sampler2D tDiffuseB;
        uniform float progress;
        uniform vec2 resolution;
        varying vec2 vUv;
        
        // Bayer matrix 8x8
        float bayer8(vec2 coord) {
          int bayerMatrix[64];
          bayerMatrix[0] = 0; bayerMatrix[1] = 32; bayerMatrix[2] = 8; bayerMatrix[3] = 40;
          bayerMatrix[4] = 2; bayerMatrix[5] = 34; bayerMatrix[6] = 10; bayerMatrix[7] = 42;
          bayerMatrix[8] = 48; bayerMatrix[9] = 16; bayerMatrix[10] = 56; bayerMatrix[11] = 24;
          bayerMatrix[12] = 50; bayerMatrix[13] = 18; bayerMatrix[14] = 58; bayerMatrix[15] = 26;
          bayerMatrix[16] = 12; bayerMatrix[17] = 44; bayerMatrix[18] = 4; bayerMatrix[19] = 36;
          bayerMatrix[20] = 14; bayerMatrix[21] = 46; bayerMatrix[22] = 6; bayerMatrix[23] = 38;
          bayerMatrix[24] = 60; bayerMatrix[25] = 28; bayerMatrix[26] = 52; bayerMatrix[27] = 20;
          bayerMatrix[28] = 62; bayerMatrix[29] = 30; bayerMatrix[30] = 54; bayerMatrix[31] = 22;
          bayerMatrix[32] = 3; bayerMatrix[33] = 35; bayerMatrix[34] = 11; bayerMatrix[35] = 43;
          bayerMatrix[36] = 1; bayerMatrix[37] = 33; bayerMatrix[38] = 9; bayerMatrix[39] = 41;
          bayerMatrix[40] = 51; bayerMatrix[41] = 19; bayerMatrix[42] = 59; bayerMatrix[43] = 27;
          bayerMatrix[44] = 49; bayerMatrix[45] = 17; bayerMatrix[46] = 57; bayerMatrix[47] = 25;
          bayerMatrix[48] = 15; bayerMatrix[49] = 47; bayerMatrix[50] = 7; bayerMatrix[51] = 39;
          bayerMatrix[52] = 13; bayerMatrix[53] = 45; bayerMatrix[54] = 5; bayerMatrix[55] = 37;
          bayerMatrix[56] = 63; bayerMatrix[57] = 31; bayerMatrix[58] = 55; bayerMatrix[59] = 23;
          bayerMatrix[60] = 61; bayerMatrix[61] = 29; bayerMatrix[62] = 53; bayerMatrix[63] = 21;
          
          ivec2 p = ivec2(mod(coord * resolution, 8.0));
          int index = p.y * 8 + p.x;
          return float(bayerMatrix[index]) / 64.0;
        }
        
        void main() {
          float threshold = bayer8(vUv);
          
          // Smooth transition
          float edge = 0.02;
          float mixer = smoothstep(threshold - edge, threshold + edge, progress);
          
          vec4 colorA = texture2D(tDiffuseA, vUv);
          vec4 colorB = texture2D(tDiffuseB, vUv);
          
          gl_FragColor = mix(colorA, colorB, mixer);
        }
      `
    });
  }
  
  createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }
  
  animate() {
    this.renderer.render(this.scene, this.camera);
  }
  
  // Public API
  setProgress(value) {
    this.material.uniforms.progress.value = value;
    this.animate();
  }
  
  transitionTo(duration = 2.0) {
    gsap.to(this.material.uniforms.progress, {
      value: 1.0,
      duration: duration,
      ease: 'power2.inOut',
      onUpdate: () => this.animate()
    });
  }
  
  reset() {
    this.material.uniforms.progress.value = 0.0;
    this.animate();
  }
}

// Usage example
export default DitheredTransition;

// If running directly:
if (typeof window !== 'undefined') {
  window.DitheredTransition = DitheredTransition;
  
  // Auto-init if container exists
  const container = document.getElementById('three-container');
  if (container) {
    const transition = new DitheredTransition(
      container,
      'Image1.jpg',
      'Image2.jpg'
    );
    
    // Expose to window for testing
    window.transition = transition;
    
    // Auto-play after 1 second
    setTimeout(() => transition.transitionTo(3), 1000);
  }
}
