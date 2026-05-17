// scripts/replaceLabels.mjs
import fs from "fs";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust this if App.tsx lives somewhere else
const appFilePath = path.join(__dirname, "..", "src", "App.tsx");

let content = fs.readFileSync(appFilePath, "utf8");

// List of safe UI text replacements
const replacements = [
  // Labels and headings
  {
    from: "Receiving Branch <",
    to: "Receiving Branch <",
  },
  {
    from: "Receiving Branch",
    to: "Receiving Branch",
  },
  {
    from: 'title="Add Warehouse"',
    to: 'title="Add Branch"',
  },
  {
    from: 'title="Edit Warehouse"',
    to: 'title="Edit Branch"',
  },
  {
    from: "Add Warehouse",
    to: "Add Branch",
  },
  {
    from: "Edit Warehouse",
    to: "Edit Branch",
  },
  {
    from: "Branch <span",
    to: "Branch <span",
  },
  {
    from: "Warehouse</label>",
    to: "Branch</label>",
  },
  {
    from: ">Warehouse<",
    to: ">Branch<",
  },

  // Dropdown placeholders
  {
    from: "Select Branch",
    to: "Select Branch",
  },

  // Button text
  {
    from: "Quick Add Branch",
    to: "Quick Add Branch",
  },

  // Messages
  {
    from: "All selected items must use the same source branch to build a transfer.",
    to: "All selected items must use the same source branch to build a transfer.",
  },
  {
    from: "Source and destination branches must be different.",
    to: "Source and destination branches must be different.",
  },
];

// Apply replacements
let changed = false;

for (const { from, to } of replacements) {
  if (content.includes(from)) {
    content = content.split(from).join(to);
    changed = true;
    console.log(`Replaced: "${from}" -> "${to}"`);
  } else {
    console.log(`Skipped (no match): "${from}"`);
  }
}

if (!changed) {
  console.log("No changes applied. Check patterns and file path.");
} else {
  fs.writeFileSync(appFilePath, content, "utf8");
  console.log(`Updates written to ${appFilePath}`);
}
