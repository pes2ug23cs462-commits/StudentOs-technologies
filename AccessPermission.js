const requestList = document.getElementById("requestList");
const peopleList = document.getElementById("peopleList");
const emptyRequests = document.getElementById("emptyRequests");
const emptyPeople = document.getElementById("emptyPeople");
const inviteDialog = document.getElementById("inviteDialog");
const editDialog = document.getElementById("editDialog");
const inviteForm = document.getElementById("inviteForm");
const editForm = document.getElementById("editForm");
const liveMessage = document.getElementById("liveMessage");
let editingRow = null;

function formatExpiry(value) {
  if (!value) {
    return "No end date";
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
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

function createPeopleRow({ name, role, access, expiry }) {
  const row = document.createElement("article");
  row.className = "people-row";
  row.setAttribute("role", "row");
  row.dataset.person = name;
  row.dataset.access = access;
  row.dataset.expiry = expiry;

  const personCell = document.createElement("span");
  personCell.className = "person-cell";
  personCell.setAttribute("role", "cell");
  const avatar = document.createElement("span");
  avatar.className = "avatar person-avatar";
  avatar.textContent = initialsFor(name);
  const personCopy = document.createElement("span");
  personCopy.className = "person-copy";
  const personName = document.createElement("strong");
  personName.textContent = name;
  const personRole = document.createElement("small");
  personRole.textContent = role;
  personCopy.append(personName, personRole);
  personCell.append(avatar, personCopy);

  const accessCell = document.createElement("span");
  accessCell.className = "access-cell";
  accessCell.setAttribute("role", "cell");
  accessCell.textContent = access;
  const expiryCell = document.createElement("span");
  expiryCell.className = "expiry-cell";
  expiryCell.setAttribute("role", "cell");
  expiryCell.textContent = formatExpiry(expiry);

  const actions = document.createElement("span");
  actions.className = "row-actions";
  const editButton = document.createElement("button");
  editButton.className = "edit-button";
  editButton.type = "button";
  editButton.textContent = "Edit";
  const revokeButton = document.createElement("button");
  revokeButton.className = "revoke-button";
  revokeButton.type = "button";
  revokeButton.textContent = "Revoke";
  actions.append(editButton, revokeButton);

  row.append(personCell, accessCell, expiryCell, actions);
  peopleList.prepend(row);
  emptyPeople.hidden = true;
  return row;
}

document.getElementById("inviteButton").addEventListener("click", () => {
  inviteForm.reset();
  inviteDialog.showModal();
  document.getElementById("inviteName").focus();
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

inviteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!inviteForm.reportValidity()) {
    return;
  }

  const name = document.getElementById("inviteName").value.trim();
  const role = document.getElementById("inviteRole").value.trim() || "Invite pending";
  const access = document.getElementById("inviteAccess").value;
  const expiry = document.getElementById("inviteExpiry").value;
  if (!name) {
    document.getElementById("inviteName").focus();
    return;
  }

  createPeopleRow({ name, role, access, expiry });
  inviteDialog.close();
  liveMessage.textContent = `Invite added for ${name}.`;
});

requestList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const request = button.closest(".request-row");
  const name = request.dataset.requestName;
  if (button.classList.contains("approve-button")) {
    createPeopleRow({
      name,
      role: "Placement Officer",
      access: "Academics, resume",
      expiry: "2027-07-31"
    });
    liveMessage.textContent = `Access request from ${name} approved.`;
  } else if (button.classList.contains("decline-button")) {
    liveMessage.textContent = `Access request from ${name} declined.`;
  } else {
    return;
  }

  request.remove();
  emptyRequests.hidden = requestList.children.length !== 0;
});

peopleList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const row = button.closest(".people-row");
  const name = row.dataset.person;
  if (button.classList.contains("edit-button")) {
    editingRow = row;
    document.getElementById("editPersonName").textContent = name;
    document.getElementById("editAccess").value = row.dataset.access;
    document.getElementById("editExpiry").value = row.dataset.expiry;
    editDialog.showModal();
    document.getElementById("editAccess").focus();
    return;
  }

  if (button.classList.contains("revoke-button") && window.confirm(`Revoke access for ${name}?`)) {
    row.remove();
    emptyPeople.hidden = peopleList.children.length !== 0;
    liveMessage.textContent = `Access for ${name} revoked.`;
  }
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!editingRow || !editForm.reportValidity()) {
    return;
  }

  const access = document.getElementById("editAccess").value;
  const expiry = document.getElementById("editExpiry").value;
  editingRow.dataset.access = access;
  editingRow.dataset.expiry = expiry;
  editingRow.querySelector(".access-cell").textContent = access;
  editingRow.querySelector(".expiry-cell").textContent = formatExpiry(expiry);
  liveMessage.textContent = `Permissions updated for ${editingRow.dataset.person}.`;
  editingRow = null;
  editDialog.close();
});

async function copyShareLink(button) {
  const shareRow = button.closest(".share-row");
  const link = new URL(shareRow.dataset.sharePath, window.location.href).href;

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(link);
    return;
  }

  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = link;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  document.body.append(temporaryInput);
  temporaryInput.select();
  const copied = document.execCommand("copy");
  temporaryInput.remove();
  if (!copied) {
    throw new Error("Clipboard access is unavailable in this browser context.");
  }
}

document.querySelectorAll(".share-row").forEach((shareRow) => {
  const copyButton = shareRow.querySelector(".copy-button");
  copyButton.addEventListener("click", async () => {
    try {
      await copyShareLink(copyButton);
      liveMessage.textContent = "Link copied to clipboard.";
    } catch (error) {
      liveMessage.textContent = error instanceof Error
        ? `Could not copy link: ${error.message}`
        : "Could not copy link.";
    }
  });

  shareRow.querySelector(".disable-button").addEventListener("click", (event) => {
    if (!window.confirm("Disable this shared link? Anyone using it will no longer have access.")) {
      return;
    }

    shareRow.dataset.disabled = "true";
    shareRow.classList.add("disabled-share");
    copyButton.disabled = true;
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Disabled";
    liveMessage.textContent = "Shared link disabled.";
  });
});