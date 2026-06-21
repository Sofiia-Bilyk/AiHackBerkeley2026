import { writeFileSync } from "node:fs";

const emptyDb = {
  profiles: [],
  communities: [],
  memberships: [],
  events: [],
  tasks: [],
  rsvps: [],
  messages: [],
  participation: [],
  content: [],
  calendarSuggestions: [],
  sponsorLeads: [],
  seeded: true,
};

writeFileSync("data/db.json", `${JSON.stringify(emptyDb, null, 2)}\n`);
console.log("Reset demo data. No user-created communities exist.");
