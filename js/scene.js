/* Noventis — Three.js scene
   Champ de particules 3D + anneau lumineux, lazy-load après paint,
   désactivé sur mobile, low-end et reduced-motion. */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktop = window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;
const lowEnd = (navigator.hardwareConcurrency || 8) < 4;

if (isDesktop && !prefersReducedMotion && !lowEnd) {
  const boot = async () => {
    try {
      const THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');

      const canvas = document.querySelector('[data-scene]');
      if (!canvas) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.z = 10;

      /* --- Particle cloud --- */
      const N = 1400;
      const positions = new Float32Array(N * 3);
      const colors = new Float32Array(N * 3);
      const sizes = new Float32Array(N);
      const c1 = new THREE.Color('#6c3de8');
      const c2 = new THREE.Color('#00d4ff');

      for (let i = 0; i < N; i++) {
        // distribution in a spherical volume
        const r = 4 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi) - 4;

        const t = Math.random();
        const c = c1.clone().lerp(c2, t);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        sizes[i] = 0.02 + Math.random() * 0.06;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geo, mat);
      scene.add(points);

      /* --- Mouse parallax --- */
      let mx = 0,
        my = 0;
      window.addEventListener('mousemove', (e) => {
        mx = (e.clientX / window.innerWidth) * 2 - 1;
        my = (e.clientY / window.innerHeight) * 2 - 1;
      });

      /* --- Resize --- */
      const onResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      /* --- Visibility pause --- */
      let visible = true;
      document.addEventListener('visibilitychange', () => {
        visible = document.visibilityState === 'visible';
      });

      /* --- Loop --- */
      const clock = new THREE.Clock();
      const tick = () => {
        if (visible) {
          const t = clock.getElapsedTime();
          points.rotation.y = t * 0.04;
          points.rotation.x = t * 0.015;

          camera.position.x += (mx * 1.5 - camera.position.x) * 0.03;
          camera.position.y += (-my * 1.5 - camera.position.y) * 0.03;
          camera.lookAt(0, 0, 0);

          renderer.render(scene, camera);
        }
        requestAnimationFrame(tick);
      };
      tick();

      canvas.classList.add('is-ready');
    } catch (err) {
      console.warn('[Noventis Design] Three.js scene skipped:', err);
    }
  };

  if ('requestIdleCallback' in window) {
    window.addEventListener('load', () => requestIdleCallback(boot, { timeout: 1500 }));
  } else {
    window.addEventListener('load', () => setTimeout(boot, 600));
  }
}
