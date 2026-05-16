const API_URL = "http://localhost:5000";

export async function getRelationships() {
  const res = await fetch(`${API_URL}/relationships`);
  return res.json();
}

export async function getInteractions() {
  const res = await fetch(`${API_URL}/interactions`);
  return res.json();
}

export async function getGraph() {
  const res = await fetch(`${API_URL}/graph`);
  return res.json();
}

export async function createRelationship(data) {
  const res = await fetch(`${API_URL}/relationships`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createInteraction(data) {
  const res = await fetch(`${API_URL}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function analyzeRelationship(payload) {
  const body =
    typeof payload === "string" ? { message: payload } : payload;

  const res = await fetch(`${API_URL}/analyzeRelationship`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
