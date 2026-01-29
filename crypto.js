async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(json, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const data = enc.encode(JSON.stringify(json));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return { salt, iv, ciphertext };
}

async function decryptData(salt, iv, ciphertext, password) {
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}

// Déchiffrer un vault à partir d'un ArrayBuffer
async function loadVaultFromArrayBuffer(buffer, password) {
  const data = new Uint8Array(buffer);

  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const ciphertext = data.slice(28);

  return await decryptData(salt, iv, ciphertext, password);
}

// Construire le binaire chiffré à partir de la DB
async function buildVaultBinary(db, password) {
  const { salt, iv, ciphertext } = await encryptData(db, password);

  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength
  );

  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);

  return combined;
}
