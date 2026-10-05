<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import type { PreviewPart } from '../app/protocol';

  let { parts, colors, size }: { parts: PreviewPart[]; colors: string[]; size: number } = $props();

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer | undefined;
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;
  const scene = new THREE.Scene();
  // Slicers use z up; three.js uses y up.
  const model = new THREE.Group();
  model.rotation.x = -Math.PI / 2;
  scene.add(model);
  let supported = $state(true);

  const render = () => renderer?.render(scene, camera);

  function setView(view: 'angle' | 'top') {
    const d = size * 2.1;
    if (view === 'top') camera.position.set(0, d, 0.001);
    else camera.position.set(0, d * 0.8, d * 0.6);
    controls.target.set(0, 0, 0);
    controls.update();
    render();
  }

  onMount(() => {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      supported = false;
      return;
    }
    renderer.setPixelRatio(window.devicePixelRatio);
    scene.background = new THREE.Color('#eef0f3');
    scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f99', 1.6));
    const key = new THREE.DirectionalLight('#ffffff', 1.6);
    key.position.set(60, 120, 80);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#ffffff', 0.5);
    fill.position.set(-80, 40, -60);
    scene.add(fill);

    camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    setView('angle');

    const resize = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = container;
      renderer!.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      render();
    });
    resize.observe(container);

    return () => {
      resize.disconnect();
      controls.dispose();
      renderer?.dispose();
    };
  });

  $effect(() => {
    if (!renderer) return;
    for (const child of [...model.children]) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      model.remove(mesh);
    }
    for (const part of parts) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(part.triangles, 1));
      const material = new THREE.MeshStandardMaterial({
        color: colors[part.slot] ?? '#888888',
        flatShading: true,
        roughness: 0.65,
        metalness: 0,
      });
      model.add(new THREE.Mesh(geometry, material));
    }
    render();
  });

  let lastSize = 0;
  $effect(() => {
    if (renderer && size !== lastSize) {
      lastSize = size;
      setView('angle');
    }
  });
</script>

<div class="preview">
  <div class="canvas" bind:this={container}><canvas bind:this={canvas}></canvas></div>
  {#if supported}
    <div class="views">
      <button type="button" class="button" onclick={() => setView('angle')}>Angled view</button>
      <button type="button" class="button" onclick={() => setView('top')}>Top view</button>
    </div>
    <p class="hint">Drag to rotate, scroll or pinch to zoom, right-drag to pan.</p>
  {:else}
    <p class="hint">This browser cannot show the 3D preview, but you can still download the file.</p>
  {/if}
</div>

<style>
  .preview {
    display: grid;
    gap: 0.5rem;
  }

  .canvas {
    aspect-ratio: 1;
    width: 100%;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
    background: #eef0f3;
    touch-action: none;
  }

  canvas {
    display: block;
  }

  .views {
    display: flex;
    gap: 0.5rem;
  }

  p {
    margin: 0;
  }
</style>
