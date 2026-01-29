/* ============================================================
   MODE MOBILE LECTURE SEULE
============================================================ */
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let mobileReadOnly = false;

if (isMobile) {
  mobileReadOnly = true;
  document.body.classList.add("mobile-readonly");
}

if (mobileReadOnly) {
  document.getElementById("mobileImportBtn").classList.remove("hidden");
}

document.getElementById("mobileImportBtn").onclick = () => {
  document.getElementById("mobileFileInput").click();
};

document.getElementById("mobileFileInput").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  masterPassword = prompt("Mot de passe maître :");
  if (!masterPassword) return;

  try {
    const buffer = await file.arrayBuffer();
    db = await loadVaultFromArrayBuffer(buffer, masterPassword);

    document.getElementById("loadSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    topMenu.classList.remove("hidden");

    showMessage("Coffre chargé (lecture seule)");
    renderEntries();
  } catch (err) {
    console.error(err);
    showMessage("Mot de passe incorrect ou fichier invalide", "error");
  }
};


/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let db = { entries: [] };
let masterPassword = "";
let fileHandle = null;

/* DOM */
const modal = document.getElementById("modalOverlay");
const topMenu = document.getElementById("topMenu");
const addEntryForm = document.getElementById("addEntryForm");
const themeToggleBtn = document.getElementById("menuThemeToggle");
const themeIcon = document.getElementById("themeIcon");
const messageContainer = document.getElementById("messageContainer");

/* ============================================================
   MESSAGES INLINE (C3-A)
============================================================ */
function showMessage(text, type = "info") {
  const div = document.createElement("div");
  div.className = "message";

  const icon = type === "error" ? "error" :
               type === "warning" ? "warning" :
               "check_circle";

  div.innerHTML = `
    <span class="material-icons-outlined">${icon}</span>
    ${text}
  `;

  messageContainer.appendChild(div);

  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateX(40px)";
    setTimeout(() => div.remove(), 400);
  }, 2600);
}

/* ============================================================
   MODE SOMBRE
============================================================ */
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    themeIcon.textContent = "light_mode";
  } else {
    document.body.classList.remove("dark");
    themeIcon.textContent = "dark_mode";
  }
}

const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

themeToggleBtn.onclick = () => {
  const current = document.body.classList.contains("dark") ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
  showMessage("Thème mis à jour");
};

/* ============================================================
   MODAL CRÉATION COFFRE
============================================================ */
document.getElementById("openCreateModal").onclick = () => {
  if (mobileReadOnly) return showMessage("Mode lecture seule sur mobile");
  modal.classList.remove("hidden");
};

document.getElementById("closeModal").onclick = () => {
  modal.classList.add("hidden");
};

document.getElementById("newVaultBtn").onclick = async () => {
  if (mobileReadOnly) return showMessage("Mode lecture seule sur mobile");

  if (!window.showSaveFilePicker) {
    showMessage("Navigateur incompatible (Chrome/Edge requis)", "error");
    return;
  }

  masterPassword = document.getElementById("newVaultPassword").value.trim();
  if (!masterPassword) {
    showMessage("Mot de passe maître requis", "warning");
    return;
  }

  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: "vault.dat",
      types: [{
        description: "Coffre chiffré",
        accept: { "application/octet-stream": [".dat"] }
      }]
    });

    db = { entries: [] };

    const binary = await buildVaultBinary(db, masterPassword);
    const writable = await fileHandle.createWritable();
    await writable.write(binary);
    await writable.close();

    modal.classList.add("hidden");
    document.getElementById("loadSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    topMenu.classList.remove("hidden");

    showMessage("Coffre créé");
    renderEntries();
  } catch (e) {
    console.error(e);
    showMessage("Création annulée", "warning");
  }
};

/* ============================================================
   OUVERTURE D’UN COFFRE EXISTANT
============================================================ */
document.getElementById("openVaultBtn").onclick = async () => {
  if (mobileReadOnly) return showMessage("Mode lecture seule sur mobile");

  if (!window.showOpenFilePicker) {
    showMessage("Navigateur incompatible (Chrome/Edge requis)", "error");
    return;
  }

  masterPassword = document.getElementById("masterPassword").value.trim();
  if (!masterPassword) {
    showMessage("Mot de passe maître requis", "warning");
    return;
  }

  try {
    [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: "Coffre chiffré",
        accept: { "application/octet-stream": [".dat"] }
      }]
    });

    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();

    db = await loadVaultFromArrayBuffer(buffer, masterPassword);

    document.getElementById("loadSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    topMenu.classList.remove("hidden");

    showMessage("Coffre chargé");
    renderEntries();
  } catch (e) {
    console.error(e);
    showMessage("Mot de passe incorrect ou fichier invalide", "error");
  }
};

/* ============================================================
   MENU
============================================================ */
document.getElementById("menuAddEntry").onclick = () => {
  if (mobileReadOnly) return showMessage("Mode lecture seule sur mobile");
  addEntryForm.classList.toggle("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

document.getElementById("menuExport").onclick = async () => {
  if (mobileReadOnly) return showMessage("Mode lecture seule sur mobile");
  if (!fileHandle) return showMessage("Aucun fichier ouvert", "warning");

  await saveVaultDirect();
  showMessage("Coffre sauvegardé");
};

document.getElementById("menuLogout").onclick = () => {
  if (mobileReadOnly) return showMessage("Mode lecture seule sur mobile");

  db = { entries: [] };
  masterPassword = "";
  fileHandle = null;

  document.getElementById("appSection").classList.add("hidden");
  topMenu.classList.add("hidden");
  document.getElementById("loadSection").classList.remove("hidden");

  showMessage("Déconnecté");
};

/* ============================================================
   SAUVEGARDE DIRECTE
============================================================ */
async function saveVaultDirect() {
  if (!fileHandle || !masterPassword) return;

  try {
    const binary = await buildVaultBinary(db, masterPassword);
    const writable = await fileHandle.createWritable();
    await writable.write(binary);
    await writable.close();
  } catch (e) {
    console.error(e);
    showMessage("Erreur de sauvegarde", "error");
  }
}

/* ============================================================
   ICÔNES PAR CATÉGORIE
============================================================ */
function getCategoryIcon(category) {
  const icons = {
    "Maison": "home",
    "Banque / Finance": "account_balance_wallet",
    "Énergie": "bolt",
    "Assurance": "shield",
    "Citoyen": "badge",
    "Comptes mails": "mail",
    "Utiles": "build"
  };
  return icons[category] || "folder";
}

/* ============================================================
   AFFICHAGE DES ENTRÉES
============================================================ */
function renderEntries() {
  const container = document.getElementById("entries");
  container.innerHTML = "";

  const query = document.getElementById("searchInput").value.toLowerCase();
  const categoryFilter = document.getElementById("searchCategory").value;
  const tagFilter = document.getElementById("searchTag").value;
  const sortBy = document.getElementById("sortBy").value;

  let entries = [...db.entries];

  /* FILTRES */
  entries = entries.filter(e => {
    const matchesText =
      e.name.toLowerCase().includes(query) ||
      (e.login || "").toLowerCase().includes(query) ||
      (e.notes || "").toLowerCase().includes(query) ||
      (e.url || "").toLowerCase().includes(query);

    const matchesCategory = !categoryFilter || e.category === categoryFilter;
    const matchesTag = !tagFilter || (e.tags && e.tags.includes(tagFilter));

    return matchesText && matchesCategory && matchesTag;
  });

  /* TRI */
  entries.sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
    if (sortBy === "createdAt") return (a.createdAt || "").localeCompare(b.createdAt || "");
    if (sortBy === "updatedAt") return (a.updatedAt || "").localeCompare(b.updatedAt || "");
    return 0;
  });

  /* AFFICHAGE */
  entries.forEach(entry => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
      <div class="entryCornerIcon">
        <span class="material-icons-outlined">${getCategoryIcon(entry.category)}</span>
      </div>

      <div class="entryHeader">
        <span class="material-icons-outlined entryIcon">${getCategoryIcon(entry.category)}</span>
        <span class="entryTitle">${entry.name}</span>
      </div>

      Login : ${entry.login || "-"}<br>

      <div class="entrySecretLine">
        <span class="entrySecretLabel">Secret :</span>
        <span class="entrySecretValue">${entry.secret}</span>
        <span class="material-icons-outlined copyInlineIcon" data-id="${entry.id}">
          content_copy
        </span>
      </div>

      URL : ${entry.url ? `<a href="${entry.url}" target="_blank">${entry.url}</a>` : "-"}<br>
      Catégorie : ${entry.category || "-"}<br>

     
      <div class="entryNotesBlock">
        ${entry.notes ? entry.notes : "<em>Aucune note</em>"}
      </div>

      ${
        entry.tags?.length
          ? entry.tags.map(t => `<span class="tagBadge">${t}</span>`).join("")
          : "<em>Aucun</em>"
      }<br><br>

      ${!mobileReadOnly ? `
        <button data-id="${entry.id}" class="editBtn">
          <span class="material-icons-outlined">edit</span> Modifier
        </button>
        <button data-id="${entry.id}" class="deleteBtn">
          <span class="material-icons-outlined">delete</span> Supprimer
        </button>
      ` : ""}
    `;

    container.appendChild(div);
  });

  attachEntryEvents();
}

/* Écouteurs de recherche */
document.getElementById("searchInput").addEventListener("input", renderEntries);
document.getElementById("searchCategory").addEventListener("change", renderEntries);
document.getElementById("searchTag").addEventListener("change", renderEntries);
document.getElementById("sortBy").addEventListener("change", renderEntries);

/* ============================================================
   AJOUT D’UNE ENTRÉE
============================================================ */
document.getElementById("addBtn").onclick = async () => {
  if (mobileReadOnly) return;

  const name = document.getElementById("newName").value.trim();
  const secret = document.getElementById("newSecret").value.trim();
  const category = document.getElementById("newCategory").value;

  if (!name || !secret || !category) {
    showMessage("Nom, code et catégorie requis", "warning");
    return;
  }

  const selectedTags = Array.from(document.querySelectorAll(".tagCheckbox:checked"))
    .map(cb => cb.value);

  db.entries.push({
    id: crypto.randomUUID(),
    name,
    login: document.getElementById("newLogin").value.trim(),
    secret,
    category,
    url: document.getElementById("newUrl").value.trim(),
    notes: document.getElementById("newNotes").value,
    tags: selectedTags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  /* Reset */
  document.getElementById("newName").value = "";
  document.getElementById("newLogin").value = "";
  document.getElementById("newSecret").value = "";
  document.getElementById("newUrl").value = "";
  document.getElementById("newCategory").value = "";
  document.getElementById("newNotes").value = "";
  document.querySelectorAll(".tagCheckbox").forEach(cb => cb.checked = false);

  renderEntries();
  await saveVaultDirect();
  showMessage("Entrée ajoutée");
};

/* ============================================================
   ÉVÉNEMENTS SUR LES ENTRÉES
============================================================ */
function attachEntryEvents() {

  /* COPIE INLINE */
  document.querySelectorAll(".copyInlineIcon").forEach(icon => {
    icon.onclick = async () => {
      const id = icon.dataset.id;
      const entry = db.entries.find(e => e.id === id);
      if (!entry) return;

      try {
        await navigator.clipboard.writeText(entry.secret);
        icon.style.transform = "scale(1.2)";
        setTimeout(() => icon.style.transform = "scale(1)", 150);
        showMessage("Code copié");
      } catch {
        showMessage("Impossible de copier", "error");
      }
    };
  });

  if (mobileReadOnly) return;

  /* SUPPRESSION */
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!confirm("Supprimer cette entrée ?")) return;

      db.entries = db.entries.filter(e => e.id !== id);
      renderEntries();
      await saveVaultDirect();
      showMessage("Entrée supprimée");
    };
  });

  /* MODIFICATION */
  document.querySelectorAll(".editBtn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const entry = db.entries.find(e => e.id === id);
      const container = btn.closest(".entry");
      turnEntryIntoForm(entry, container);
    };
  });
}

/* ============================================================
   FORMULAIRE D’ÉDITION INLINE
============================================================ */
function turnEntryIntoForm(entry, container) {
  container.innerHTML = `
    <div class="card" style="animation: slideDown 0.3s ease;">
      <h3><span class="material-icons-outlined">edit</span> Modifier</h3>

      <input id="editName" value="${entry.name}">
      <input id="editLogin" value="${entry.login || ""}">
      <input id="editSecret" value="${entry.secret}">
      <input id="editUrl" value="${entry.url || ""}">

      <select id="editCategory">
        <option value="">-- Catégorie --</option>
        <option ${entry.category === "Maison" ? "selected" : ""}>Maison</option>
        <option ${entry.category === "Banque / Finance" ? "selected" : ""}>Banque / Finance</option>
        <option ${entry.category === "Énergie" ? "selected" : ""}>Énergie</option>
        <option ${entry.category === "Assurance" ? "selected" : ""}>Assurance</option>
        <option ${entry.category === "Citoyen" ? "selected" : ""}>Citoyen</option>
        <option ${entry.category === "Comptes mails" ? "selected" : ""}>Comptes mails</option>
        <option ${entry.category === "Utiles" ? "selected" : ""}>Utiles</option>
      </select>

      <label>Tags :</label>
      <div class="tagsContainer">
        ${["Christophe","Bérangère","Alexis","Orange","UM"].map(tag => `
          <label>
            <input type="checkbox" class="editTagCheckbox" value="${tag}"
              ${entry.tags?.includes(tag) ? "checked" : ""}>
            ${tag}
          </label>
        `).join("")}
      </div>

      <textarea id="editNotes">${entry.notes || ""}</textarea>

      <button class="primary" id="saveEditBtn">
        <span class="material-icons-outlined">check</span> Enregistrer
      </button>
      <button class="secondary" id="cancelEditBtn">
        <span class="material-icons-outlined">close</span> Annuler
      </button>
    </div>
  `;

  /* SAUVEGARDE */
  document.getElementById("saveEditBtn").onclick = async () => {
    const name = document.getElementById("editName").value.trim();
    const secret = document.getElementById("editSecret").value.trim();
    const category = document.getElementById("editCategory").value;

    if (!name || !secret || !category) {
      showMessage("Nom, code et catégorie requis", "warning");
      return;
    }

    entry.name = name;
    entry.login = document.getElementById("editLogin").value.trim();
    entry.secret = secret;
    entry.url = document.getElementById("editUrl").value.trim();
    entry.category = category;
    entry.notes = document.getElementById("editNotes").value;

    entry.tags = Array.from(document.querySelectorAll(".editTagCheckbox:checked"))
      .map(cb => cb.value);

    entry.updatedAt = new Date().toISOString();

    renderEntries();
    await saveVaultDirect();
    showMessage("Entrée modifiée");
  };

  /* ANNULATION */
  document.getElementById("cancelEditBtn").onclick = () => {
    renderEntries();
  };
}
