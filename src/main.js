import * as THREE from 'three';
import * as TWEEN from 'three/addons/libs/tween.module.js';
import {
  CSS3DObject,
  CSS3DRenderer,
} from 'three/addons/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

import './style.css';

let camera;
let scene;
let renderer;
let controls;

const objects = [];
const targets = {
  table: [],
  sphere: [],
  helix: [],
  grid: [],
};

// Temporary sample data.
// Later, this will come from Google Sheets.
const sampleData = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  name: `Company ${index + 1}`,
  industry: index % 2 === 0 ? 'Technology' : 'Finance',
  netWorth: (index + 1) * 500000,
}));

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );

  camera.position.z = 3000;

  scene = new THREE.Scene();

  createCards();
  createTableTargets();
  createSphereTargets();
  createHelixTargets();
  createGridTargets();

  renderer = new CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app').appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener('change', render);

  document
    .getElementById('table')
    .addEventListener('click', () => transform(targets.table, 1500));

  document
    .getElementById('sphere')
    .addEventListener('click', () => transform(targets.sphere, 1500));

  document
    .getElementById('helix')
    .addEventListener('click', () => transform(targets.helix, 1500));

  document
    .getElementById('grid')
    .addEventListener('click', () => transform(targets.grid, 1500));

  window.addEventListener('resize', onWindowResize);

  transform(targets.table, 1500);
}

function createCards() {
  sampleData.forEach((company) => {
    const card = document.createElement('div');
    card.className = 'element';

    const number = document.createElement('div');
    number.className = 'number';
    number.textContent = company.id;
    card.appendChild(number);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = company.name;
    card.appendChild(name);

    const details = document.createElement('div');
    details.className = 'details';
    details.innerHTML = `
      ${company.industry}<br>
      RM ${company.netWorth.toLocaleString()}
    `;
    card.appendChild(details);

    const object = new CSS3DObject(card);

    object.position.x = Math.random() * 4000 - 2000;
    object.position.y = Math.random() * 4000 - 2000;
    object.position.z = Math.random() * 4000 - 2000;

    scene.add(object);
    objects.push(object);
  });
}

function createTableTargets() {
  sampleData.forEach((company, index) => {
    const object = new THREE.Object3D();

    const column = index % 5;
    const row = Math.floor(index / 5);

    object.position.x = column * 300 - 600;
    object.position.y = -(row * 220) + 330;

    targets.table.push(object);
  });
}

function createSphereTargets() {
  const vector = new THREE.Vector3();

  sampleData.forEach((company, index) => {
    const phi = Math.acos(-1 + (2 * index) / sampleData.length);
    const theta = Math.sqrt(sampleData.length * Math.PI) * phi;

    const object = new THREE.Object3D();

    object.position.setFromSphericalCoords(800, phi, theta);

    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);

    targets.sphere.push(object);
  });
}

function createHelixTargets() {
  const vector = new THREE.Vector3();

  sampleData.forEach((company, index) => {
    const theta = index * 0.5 + Math.PI;
    const y = -(index * 35) + 350;

    const object = new THREE.Object3D();

    object.position.setFromCylindricalCoords(700, theta, y);

    vector.x = object.position.x * 2;
    vector.y = object.position.y;
    vector.z = object.position.z * 2;

    object.lookAt(vector);

    targets.helix.push(object);
  });
}

function createGridTargets() {
  sampleData.forEach((company, index) => {
    const object = new THREE.Object3D();

    object.position.x = (index % 5) * 400 - 800;
    object.position.y = -(Math.floor(index / 5) % 4) * 300 + 450;
    object.position.z = Math.floor(index / 20) * 700;

    targets.grid.push(object);
  });
}

function transform(targetLayout, duration) {
  TWEEN.removeAll();

  objects.forEach((object, index) => {
    const target = targetLayout[index];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  });

  new TWEEN.Tween({})
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function animate() {
  requestAnimationFrame(animate);

  TWEEN.update();
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}