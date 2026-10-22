const settingsTabs = Array.from(document.querySelectorAll(".settings-tab"));
const settingsPanels = Array.from(document.querySelectorAll(".settings-panel"));
const visibilityOptions = Array.from(document.querySelectorAll(".visibility-option"));
const permissionList = document.getElementById("permissionList");
const emptyPermissions = document.getElementById("emptyPermissions");
const inviteDialog = document.getElementById("inviteDialog");
const inviteForm = document.getElementById("inviteForm");
const inviteName = document.getElementById("inviteName");
const inviteAccess = document.getElementById("inviteAccess");
const inviteExpiry = document.getElementById("inviteExpiry");

function activateSettingsTab(tab) {
  const panelId = tab.dataset.panel;

  settingsTabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });

  settingsPanels.forEach((panel) => {
    const selected = panel.id === panelId;
    panel.hidden = !selected;
    if (selected) {
      panel.setAttribute("aria-labelledby", tab.id);
    }
  });
}

settingsTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    if (tab.id === "permissionsTab") {
      window.location.href = "./AccessPermission.html";
      return;
    }

    if (tab.id === "dataTab") {
      window.location.href = "./AIAssi.html";
      return;
    }

    activateSettingsTab(tab);
  });
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + settingsTabs.length) % settingsTabs.length;
    settingsTabs[nextIndex].focus();
    activateSettingsTab(settingsTabs[nextIndex]);
  });
});

visibilityOptions.forEach((option) => {
  option.querySelector('input[type="radio"]').addEventListener("change", (event) => {
    if (!event.currentTarget.checked) {
      return;
    }

    visibilityOptions.forEach((item) => {
      item.classList.toggle("selected", item === option);
    });
  });
});

document.getElementById("saveProfile").addEventListener("click", () => {
  document.getElementById("profileMessage").textContent =
    "Profile form ready. Connect your backend to save changes permanently.";
});

document.getElementById("passwordBtn").addEventListener("click", () => {
  document.getElementById("securityMessage").textContent =
    "Connect your authentication backend to change your password securely.";
});

function formatExpiry(value) {
  if (!value) {
    return "No end date";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function initialsFor(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

document.getElementById("inviteButton").addEventListener("click", () => {
  inviteForm.reset();
  inviteDialog.showModal();
  inviteName.focus();
});

function closeInviteDialog() {
  inviteDialog.close();
}

document.getElementById("closeInvite").addEventListener("click", closeInviteDialog);
document.getElementById("cancelInvite").addEventListener("click", closeInviteDialog);

inviteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!inviteForm.reportValidity()) {
    return;
  }

  const name = inviteName.value.trim();
  if (!name) {
    inviteName.focus();
    return;
  }

  const row = document.createElement("div");
  row.className = "permission-row";
  row.setAttribute("role", "row");

  const personCell = document.createElement("span");
  personCell.className = "person-cell";
  personCell.setAttribute("role", "cell");

  const avatar = document.createElement("span");
  avatar.className = "avatar permission-avatar";
  avatar.textContent = initialsFor(name);

  const personCopy = document.createElement("span");
  personCopy.className = "person-copy";
  const personName = document.createElement("strong");
  personName.textContent = name;
  const relationship = document.createElement("small");
  relationship.textContent = "Invite pending";
  personCopy.append(personName, relationship);
  personCell.append(avatar, personCopy);

  const accessCell = document.createElement("span");
  accessCell.className = "access-cell";
  accessCell.setAttribute("role", "cell");
  accessCell.textContent = inviteAccess.value;

  const expiryCell = document.createElement("span");
  expiryCell.className = "expiry-cell";
  expiryCell.setAttribute("role", "cell");
  expiryCell.textContent = formatExpiry(inviteExpiry.value);

  const revokeButton = document.createElement("button");
  revokeButton.className = "revoke-button";
  revokeButton.type = "button";
  revokeButton.textContent = "Revoke";
  revokeButton.setAttribute("aria-label", `Revoke access for ${name}`);

  row.append(personCell, accessCell, expiryCell, revokeButton);
  permissionList.prepend(row);
  emptyPermissions.hidden = true;
  closeInviteDialog();
});

permissionList.addEventListener("click", (event) => {
  const revokeButton = event.target.closest(".revoke-button");
  if (!revokeButton) {
    return;
  }

  revokeButton.closest(".permission-row").remove();
  emptyPermissions.hidden = permissionList.children.length !== 0;
});
