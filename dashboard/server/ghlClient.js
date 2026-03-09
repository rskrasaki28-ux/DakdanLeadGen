import axios from "axios";

const GHL_API_KEY = process.env.GHL_API_KEY; // Change to the actual env variable name
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID; // Unsure if needed

const ghl = axios.create({
  baseURL: "https://rest.gohighlevel.com/v1",
  headers: {
    Authorization: `Bearer ${GHL_API_KEY}`,
    "Content-Type": "application/json"
  }
});

export async function fetchLeads() {
  const response = await ghl.get("/contacts/", {
    params: {
      locationId: GHL_LOCATION_ID
    }
  });

  return response.data.contacts || [];
}