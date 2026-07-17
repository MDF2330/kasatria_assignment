import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

import './style.css';

let camera;
let scene;
let renderer;
let controls;

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );

  camera.position.z = 1800;

  scene = new THREE.Scene();

  const card = document.createElement('div');
  card.className = 'element';

  const number = document.createElement('div');
  number.className = 'number';
  number.textContent = '1';
  card.appendChild(number);

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = 'Kasatria';
  card.appendChild(name);

  const details = document.createElement('div');
  details.className = 'details';
  details.innerHTML = 'Software Developer<br>Assignment';
  card.appendChild(details);

  const object = new CSS3DObject(card);
  scene.add(object);

  renderer = new CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener('change', render);

  window.addEventListener('resize', onWindowResize);

  render();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}