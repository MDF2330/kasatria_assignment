import {
  GOOGLE_CLIENT_ID,
  SPREADSHEET_ID,
  SHEET_NAME,
} from './config.js';

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
let tokenClient;
let accessToken = null;
let animationStarted = false;

const objects = [];

const targets = {
  table: [],
  sphere: [],
  helix: [],
  grid: [],
};

let peopleData = [];

window.addEventListener('load', initializeGoogleLogin);

function initializeGoogleLogin() {
  if (!window.google) {
    console.error('Google Identity Services failed to load.');
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    callback: handleAccessTokenResponse,
    error_callback: handleOAuthPopupError,
  });

  google.accounts.id.renderButton(
    document.getElementById('login'),
    {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
    }
  );
}

function handleCredentialResponse(response) {
  try {
    const user = decodeJwtResponse(response.credential);

    console.log('Signed-in user:', user);

    showUserProfile(user);
    showSheetsButton();
  } catch (error) {
    console.error('Unable to process Google login:', error);
  }
}

function showUserProfile(user) {
  const loginContainer = document.getElementById('login');

  loginContainer.innerHTML = `
    <div class="user-profile">
      <img
        src="${user.picture || ''}"
        alt="${user.name || 'Google user'}"
        class="user-avatar"
      >

      <div class="user-info">
        <strong>${user.name || 'Google User'}</strong>
        <span>${user.email || ''}</span>
      </div>

      <button id="logout-button" type="button">
        Sign out
      </button>
    </div>
  `;

  document
    .getElementById('logout-button')
    .addEventListener('click', signOut);
}

function showSheetsButton() {
  const existingButton = document.getElementById(
    'connect-sheets-button'
  );

  if (existingButton) {
    return;
  }

  const button = document.createElement('button');

  button.id = 'connect-sheets-button';
  button.type = 'button';
  button.textContent = 'Connect Google Sheets';

  button.addEventListener('click', requestSheetsAccess);

  document.body.appendChild(button);
}

function requestSheetsAccess() {
  if (!tokenClient) {
    console.error('Google OAuth token client is not ready.');
    return;
  }

  tokenClient.requestAccessToken({
    prompt: 'consent',
  });
}

async function handleAccessTokenResponse(tokenResponse) {
  if (!tokenResponse || tokenResponse.error) {
    console.error(
      'Google authorization failed:',
      tokenResponse
    );
    return;
  }

  accessToken = tokenResponse.access_token;

  if (!accessToken) {
    console.error('No Google access token was returned.');
    return;
  }

  console.log('Sheets access granted.');

  const connectButton = document.getElementById(
    'connect-sheets-button'
  );

  if (connectButton) {
    connectButton.disabled = true;
    connectButton.textContent = 'Google Sheets Connected';
  }

  try {
    const rows = await testGoogleSheetsConnection();

    peopleData = convertRowsToPeople(rows);

    console.log('Converted people:', peopleData);
    console.log('People count:', peopleData.length);

    if (!animationStarted) {
      init();
      animate();
      animationStarted = true;
    }
  } catch (error) {
    console.error('Unable to read Google Sheet:', error);

    if (connectButton) {
      connectButton.disabled = false;
      connectButton.textContent = 'Retry Google Sheets';
    }
  }
}

function handleOAuthPopupError(error) {
  console.error('Google OAuth popup error:', error);
}

async function testGoogleSheetsConnection() {
  const range = `${SHEET_NAME}!A1:F201`;

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/` +
    `${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorDetails = await response.text();

    throw new Error(
      `Google Sheets request failed: ` +
      `${response.status} ${errorDetails}`
    );
  }

  const data = await response.json();

  console.log('Google Sheets response:', data);
  console.log('Rows received:', data.values?.length ?? 0);

  return data.values ?? [];
}

function convertRowsToPeople(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error(
      'The Google Sheet does not contain any data rows.'
    );
  }

  const headers = rows[0].map((header) =>
    String(header).trim()
  );

  return rows
    .slice(1)
    .filter((row) =>
      row.some((cell) => String(cell).trim() !== '')
    )
    .map((row, index) => {
      const record = {};

      headers.forEach((header, columnIndex) => {
        record[header] = row[columnIndex] ?? '';
      });

      return {
        id: index + 1,
        name: String(
          record.Name || 'Unknown'
        ).trim(),
        photo: String(
          record.Photo || ''
        ).trim(),
        age: Number(record.Age) || 0,
        country: String(
          record.Country || 'Unknown'
        ).trim(),
        interest: String(
          record.Interest || 'Unknown'
        ).trim(),
        netWorth: parseNetWorth(
          record['Net Worth']
        ),
      };
    });
}

function parseNetWorth(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  const cleanedValue = String(value)
    .replace(/[$,\s]/g, '')
    .trim();

  const parsedValue = Number(cleanedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}

function formatNetWorth(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getNetWorthClass(netWorth) {
  if (netWorth < 100000) {
    return 'net-worth-low';
  }

  if (netWorth <= 500000) {
    return 'net-worth-medium';
  }

  return 'net-worth-high';
}

function decodeJwtResponse(token) {
  const base64Url = token.split('.')[1];

  const base64 = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((character) => {
        return `%${(
          `00${character.charCodeAt(0).toString(16)}`
        ).slice(-2)}`;
      })
      .join('')
  );

  return JSON.parse(jsonPayload);
}

function signOut() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Google Sheets access revoked.');
    });
  }

  google.accounts.id.disableAutoSelect();
  window.location.reload();
}

function init() {
  clearExistingSceneData();

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );

  camera.position.z = 5200;

  scene = new THREE.Scene();

  createCards();
  createTableTargets();
  createSphereTargets();
  createHelixTargets();
  createGridTargets();

  renderer = new CSS3DRenderer();
  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  document
    .getElementById('app')
    .appendChild(renderer.domElement);

  controls = new TrackballControls(
    camera,
    renderer.domElement
  );

  controls.minDistance = 500;
  controls.maxDistance = 10000;
  controls.addEventListener('change', render);

  document
    .getElementById('table')
    .addEventListener(
      'click',
      () => transform(targets.table, 1500)
    );

  document
    .getElementById('sphere')
    .addEventListener(
      'click',
      () => transform(targets.sphere, 1500)
    );

  document
    .getElementById('helix')
    .addEventListener(
      'click',
      () => transform(targets.helix, 1500)
    );

  document
    .getElementById('grid')
    .addEventListener(
      'click',
      () => transform(targets.grid, 1500)
    );

  window.addEventListener('resize', onWindowResize);

  transform(targets.table, 1500);
}

function clearExistingSceneData() {
  objects.length = 0;

  targets.table.length = 0;
  targets.sphere.length = 0;
  targets.helix.length = 0;
  targets.grid.length = 0;

  const app = document.getElementById('app');

  if (app) {
    app.innerHTML = '';
  }
}

function createCards() {
  peopleData.forEach((person) => {
    const card = document.createElement('div');

    card.className = [
      'element',
      getNetWorthClass(person.netWorth),
    ].join(' ');

    const number = document.createElement('div');
    number.className = 'number';
    number.textContent = person.id;
    card.appendChild(number);

    const photo = document.createElement('img');
    photo.className = 'person-photo';
    photo.alt = person.name;
    photo.loading = 'lazy';

    photo.src =
      person.photo ||
      'https://placehold.co/100x100?text=No+Photo';

    photo.addEventListener('error', () => {
      if (!photo.src.includes('placehold.co')) {
        photo.src =
          'https://placehold.co/100x100?text=No+Photo';
      }
    });

    card.appendChild(photo);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = person.name;
    card.appendChild(name);

    const details = document.createElement('div');
    details.className = 'details';

    details.innerHTML = `
      <span>Age: ${person.age}</span>
      <span>Country: ${person.country}</span>
      <span>Interest: ${person.interest}</span>
      <strong>${formatNetWorth(person.netWorth)}</strong>
    `;

    card.appendChild(details);

    const object = new CSS3DObject(card);

    object.position.x =
      Math.random() * 4000 - 2000;

    object.position.y =
      Math.random() * 4000 - 2000;

    object.position.z =
      Math.random() * 4000 - 2000;

    scene.add(object);
    objects.push(object);
  });
}

function createTableTargets() {
  const columns = 20;
  const horizontalSpacing = 190;
  const verticalSpacing = 250;

  peopleData.forEach((person, index) => {
    const object = new THREE.Object3D();

    const column = index % columns;
    const row = Math.floor(index / columns);

    object.position.x =
      (column - (columns - 1) / 2) *
      horizontalSpacing;

    object.position.y =
      ((10 - 1) / 2 - row) *
      verticalSpacing;

    object.position.z = 0;

    targets.table.push(object);
  });
}

function createSphereTargets() {
  const vector = new THREE.Vector3();

  peopleData.forEach((person, index) => {
    const phi = Math.acos(
      -1 + (2 * index) / peopleData.length
    );

    const theta =
      Math.sqrt(peopleData.length * Math.PI) *
      phi;

    const object = new THREE.Object3D();

    object.position.setFromSphericalCoords(
      1400,
      phi,
      theta
    );

    vector
      .copy(object.position)
      .multiplyScalar(2);

    object.lookAt(vector);

    targets.sphere.push(object);
  });
}

function createHelixTargets() {
  const vector = new THREE.Vector3();

  const radius = 900;
  const verticalSpacing = 28;
  const angleStep = 0.35;

  peopleData.forEach((person, index) => {
    const object = new THREE.Object3D();

    // Even = left strand
    // Odd = right strand
    const strand = index % 2;

    // Position within each strand
    const level = Math.floor(index / 2);

    const theta =
      level * angleStep +
      (strand === 0 ? 0 : Math.PI);

    const y =
      -(level * verticalSpacing) + 1400;

    object.position.setFromCylindricalCoords(
      radius,
      theta,
      y
    );

    vector.set(
      object.position.x * 2,
      object.position.y,
      object.position.z * 2
    );

    object.lookAt(vector);

    targets.helix.push(object);
  });
}

function createGridTargets() {
  const columns = 5;
  const rows = 4;
  const layers = 10;

  const xSpacing = 400;
  const ySpacing = 300;
  const zSpacing = 700;

  peopleData.forEach((person, index) => {
    const object = new THREE.Object3D();

    const column = index % columns;
    const row = Math.floor(index / columns) % rows;
    const layer = Math.floor(index / (columns * rows));

    object.position.x =
      (column - (columns - 1) / 2) * xSpacing;

    object.position.y =
      ((rows - 1) / 2 - row) * ySpacing;

    object.position.z =
      (layer - (layers - 1) / 2) * zSpacing;

    targets.grid.push(object);
  });
}

function transform(targetLayout, duration) {
  TWEEN.removeAll();

  objects.forEach((object, index) => {
    const target = targetLayout[index];

    if (!target) {
      return;
    }

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z,
        },
        Math.random() * duration + duration
      )
      .easing(
        TWEEN.Easing.Exponential.InOut
      )
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
      .easing(
        TWEEN.Easing.Exponential.InOut
      )
      .start();
  });

  new TWEEN.Tween({})
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

function onWindowResize() {
  if (!camera || !renderer) {
    return;
  }

  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  render();
}

function animate() {
  requestAnimationFrame(animate);

  TWEEN.update();

  if (controls) {
    controls.update();
  }
}

function render() {
  if (!renderer || !scene || !camera) {
    return;
  }

  renderer.render(scene, camera);
}