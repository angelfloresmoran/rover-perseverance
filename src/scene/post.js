import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const FilmFinishShader = {
  name: 'FilmFinishShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime_s: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime_s;
    varying vec2 vUv;
    float grain(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;
      vec2 centered = vUv - 0.5;
      color *= 1.0 - dot(centered, centered) * 0.62;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      // Sombras tostadas y un poco más de contraste, como en un etalonaje de cine.
      color = mix(color, color * vec3(1.05, 0.97, 0.88), 1.0 - luma);
      color = mix(color, color * color * (3.0 - 2.0 * color), 0.28);
      color += (grain(vUv + fract(uTime_s)) - 0.5) * 0.022;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.16, 0.55, 1.4));
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FilmFinishShader);
  composer.addPass(finish);
  return {
    render(time_s) {
      finish.uniforms.uTime_s.value = time_s;
      composer.render();
    },
    setSize(width, height) {
      composer.setSize(width, height);
    },
  };
}
