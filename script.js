// script.js v9.14 FINAL – Full integrated build

async function init() {
  try {
    const res = await fetch('skus.json');
    const skuDescriptions = await res.json();

    const app = document.getElementById("app");
    const form = document.createElement("form");
    form.className = "space-y-4";

    function select(id, label, options) {
      let html = `<div><label class="block font-medium">${label}</label>
      <select id="${id}" class="border p-2 w-full"><option value="">--</option>`;
      options.forEach(o => html += `<option value="${o}">${o}</option>`);
      html += "</select></div>";
      return html;
    }

    form.innerHTML += select("typeOfSystem", "Type of System", ["USB bar only","Windows PC based solution","Android appliance based room system"]);
    form.innerHTML += select("platform", "Select Primary Platform", ["Zoom","Microsoft Teams","Google Meet"]);
    form.innerHTML += select("roomSize", "Room Size", ["Small","Medium","Large","Very large space, >25’ from front of room to furthest person, too big for all-in-one bar."]);
    form.innerHTML += select("mounting", "Select add-on Mounting option", ["None","Wall","VESA style display mount","Table"]);
    form.innerHTML += select("expansionMic", "Include Expansion Mic?", ["None","Yes"]);
    form.innerHTML += select("schedulingPanel", "Include additional TC10 to use as scheduling panel outside room?", ["None","Yes"]);
    form.innerHTML += select("supportTerm", "Select Support Term", ["None","1yr","3yr"]);
    form.innerHTML += `<div id="extraQuestions"></div>`;
    form.innerHTML += `<div><label class="block font-medium">Accessories (comma-separated)</label>
      <input id="accessories" class="border p-2 w-full" placeholder="e.g. Camera, Remote"/></div>`;

    form.innerHTML += `<button type="button" id="generateBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Generate BOM</button>
      <div id="result" class="mt-6"></div>`;

    app.innerHTML = "";
    app.appendChild(form);

    document.getElementById("roomSize").addEventListener("change", () => showExtraQuestions());
    document.getElementById("typeOfSystem").addEventListener("change", () => showExtraQuestions());
    document.getElementById("generateBtn").addEventListener("click", () => generate(skuDescriptions));

    function showExtraQuestions() {
      const extra = document.getElementById("extraQuestions");
      extra.innerHTML = "";
      const typeOfSystem = document.getElementById("typeOfSystem").value;
      const roomSize = document.getElementById("roomSize").value;

      if (roomSize.includes("Very large") && typeOfSystem === "Android appliance based room system") {
        extra.innerHTML += select("externalCamera", "Select External Camera(s) needed", ["No External Camera needed", "Poly E70 Camera", "Poly E60 Camera"]);
        extra.innerHTML += select("largeRoomAudio", "Large room Audio not included, add Poly Audio?", [
          "No, existing or 3rd party audio to be used, No Poly audio needed",
          "Poly IP Ceiling mic array",
          "Poly IP Table mic array",
          "Add Poly Trio C60 with Expansion mic kit as Audio"
        ]);
      }
    }

  } catch(e) {
    document.getElementById("app").innerHTML = "<p class='text-red-600'>Failed to load skus.json.</p>";
    console.error(e);
  }
}

function generate(skuDescriptions) {
  const results = [];
  const expansionMicOptions = [];

  const typeOfSystem = document.getElementById("typeOfSystem").value;
  const platform = document.getElementById("platform").value;
  const roomSize = document.getElementById("roomSize").value;
  const expansionMic = document.getElementById("expansionMic").value;
  const mounting = document.getElementById("mounting").value;
  const schedulingPanel = document.getElementById("schedulingPanel").value;
  const supportTerm = document.getElementById("supportTerm").value;
  const accessories = document.getElementById("accessories").value.split(",").map(x=>x.trim()).filter(x=>x);
  const externalCamera = document.getElementById("externalCamera") ? document.getElementById("externalCamera").value : "";
  const largeRoomAudio = document.getElementById("largeRoomAudio") ? document.getElementById("largeRoomAudio").value : "";

  // Very Large room + Android logic
  if (roomSize.includes("Very large") && typeOfSystem === "Android appliance based room system") {
    const g62sku = "A01KCAA#AC3";
    if (skuDescriptions[g62sku]) results.push({ sku: g62sku, description: skuDescriptions[g62sku] });

    const tc10sku = "977L6AA#ABA";
    if (skuDescriptions[tc10sku]) results.push({ sku: tc10sku, description: skuDescriptions[tc10sku] });

    const tc10support = supportTerm === "3yr" ? "P37760312" : "P37760112";
    if (skuDescriptions[tc10support]) results.push({ sku: tc10support, description: skuDescriptions[tc10support] });

    const g62support = supportTerm === "3yr" ? "U77D3PV" : "U86WDPV";
    if (skuDescriptions[g62support]) results.push({ sku: g62support, description: skuDescriptions[g62support] });

    if (externalCamera === "Poly E70 Camera") {
      const e70sku = "842F8AA";
      if (skuDescriptions[e70sku]) results.push({ sku: e70sku, description: skuDescriptions[e70sku] });
      const e70support = supportTerm === "3yr" ? "P87090312" : "P87090112";
      if (skuDescriptions[e70support]) results.push({ sku: e70support, description: skuDescriptions[e70support] });
    }
    if (externalCamera === "Poly E60 Camera") {
      const e60sku = "9W1A6AA#AC3";
      if (skuDescriptions[e60sku]) results.push({ sku: e60sku, description: skuDescriptions[e60sku] });
      const e60support = supportTerm === "3yr" ? "U86LDPV" : "U86LCPV";
      if (skuDescriptions[e60support]) results.push({ sku: e60support, description: skuDescriptions[e60support] });
    }

    if (largeRoomAudio === "Poly IP Ceiling mic array") {
      const ceiling = "875S1AA";
      const netgear = "GSM4210PD M4250-9G1F-PoE+";
      if (skuDescriptions[ceiling]) results.push({ sku: ceiling, description: skuDescriptions[ceiling] });
      results.push({ sku: netgear, description: "3rd party Netgear AV PoE switch with PTP" });
    }
    if (largeRoomAudio === "Poly IP Table mic array") {
      const table = "874R3AA";
      const netgear = "GSM4210PD M4250-9G1F-PoE+";
      if (skuDescriptions[table]) results.push({ sku: table, description: skuDescriptions[table] });
      results.push({ sku: netgear, description: "3rd party Netgear AV PoE switch with PTP" });
    }
    if (largeRoomAudio === "Add Poly Trio C60 with Expansion mic kit as Audio") {
      const trio = "849B6AA#ABA";
      const trioKit = "85X02AA";
      if (skuDescriptions[trio]) results.push({ sku: trio, description: skuDescriptions[trio] });
      if (skuDescriptions[trioKit]) results.push({ sku: trioKit, description: skuDescriptions[trioKit] });
      const trioSupport = supportTerm === "3yr" ? "P86240312" : "P86240112";
      if (skuDescriptions[trioSupport]) results.push({ sku: trioSupport, description: skuDescriptions[trioSupport] });
    }
  }

  // General product SKU logic for all system types
if (typeOfSystem === "Android appliance based room system") {
  let prodSku = "", supportSku = "";
  if (roomSize === "Small") { 
    prodSku = "A3SV5AA#ABA"; 
    supportSku = supportTerm === "3yr" ? "UE1Q9PV" : "UE1Q8PV";

    // ADDITIONAL SKUs for X32 small room Android appliance
    const poeInjector = "B5NH6AA";
    const tc10 = "977L6AA#ABA";
    const tc10support = supportTerm === "3yr" ? "P37760312" : "P37760112";

    if (skuDescriptions[poeInjector]) results.push({ sku: poeInjector, description: skuDescriptions[poeInjector] });
    if (skuDescriptions[tc10]) results.push({ sku: tc10, description: skuDescriptions[tc10] });
    if (skuDescriptions[tc10support]) results.push({ sku: tc10support, description: skuDescriptions[tc10support] });
  }
  else if (roomSize === "Medium") { 
    prodSku = "8D8L1AA#ABA"; 
    supportSku = supportTerm === "3yr" ? "P87625312" : "P87625112"; 
  }
  else if (roomSize === "Large") { 
    prodSku = "A4MA7AA#ABA"; 
    supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98SXPV"; 
  }

  if (skuDescriptions[prodSku]) results.push({ sku: prodSku, description: skuDescriptions[prodSku] });
  if (skuDescriptions[supportSku]) results.push({ sku: supportSku, description: skuDescriptions[supportSku] });
}
if (typeOfSystem === "USB bar only") {
  let prodSku = "", supportSku = "";
  if (roomSize === "Small") {
    prodSku = "A9DD8AA#ABA";
    supportSku = supportTerm === "3yr" ? "UE1X7PV" : "UE1X6PV";

    const poeInjector = "B5NH6AA";
    if (skuDescriptions[poeInjector]) results.push({ sku: poeInjector, description: skuDescriptions[poeInjector] });
  }
  else if (roomSize === "Medium") {
    prodSku = "A09D4AA#ABA";
    supportSku = supportTerm === "3yr" ? "U86MQPV" : "U86MNPV";
  }
  else if (roomSize === "Large") {
    prodSku = "AV1E3AA#ABA";
    supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98X0PV";
  }

  if (skuDescriptions[prodSku]) results.push({ sku: prodSku, description: skuDescriptions[prodSku] });
  if (skuDescriptions[supportSku]) results.push({ sku: supportSku, description: skuDescriptions[supportSku] });
}

if (typeOfSystem === "Windows PC based solution") {
if (roomSize === "Small") {
  prodSku = "A9DD8AA#ABA";
  supportSku = supportTerm === "3yr" ? "UE1X7PV" : "UE1X6PV";
  
  // ✅ Also add B5NH6AA PoE power injector
  const poeInjector = "B5NH6AA";
  if (skuDescriptions[poeInjector]) results.push({ sku: poeInjector, description: skuDescriptions[poeInjector] });
}

  else if (roomSize === "Medium") { 
    prodSku = "A09D4AA#ABA"; 
    supportSku = supportTerm === "3yr" ? "U86MQPV" : "U86MNPV"; 
  }
  else if (roomSize === "Large") { 
    prodSku = "AV1E3AA#ABA"; 
    supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98X0PV"; 
  }

  if (skuDescriptions[prodSku]) results.push({ sku: prodSku, description: skuDescriptions[prodSku] });
  if (skuDescriptions[supportSku]) results.push({ sku: supportSku, description: skuDescriptions[supportSku] });

  // Always add MTR base kit + support SKU for Windows PC based solutions
  const mtrSku = "A3LU8AA#ABA";
  const mtrSupport = supportTerm === "3yr" ? "U95J9PV" : "U95J8PV";
  if (skuDescriptions[mtrSku]) results.push({ sku: mtrSku, description: skuDescriptions[mtrSku] });
  if (skuDescriptions[mtrSupport]) results.push({ sku: mtrSupport, description: skuDescriptions[mtrSupport] });
}


  // Expansion mic options table (Android Large rooms)
  if (expansionMic === "Yes" && typeOfSystem === "Android appliance based room system" && roomSize === "Large") {
    expansionMicOptions.push({ sku: "875M6AA", description: "Analog expansion mic for Studio USB/X50/X52/V52/X70/X72/V72" });
    expansionMicOptions.push({ sku: "OR", description: "" });
    expansionMicOptions.push({ sku: "874R3AA", description: skuDescriptions["874R3AA"] || "Poly IP table microphone array" });
    expansionMicOptions.push({ sku: "GSM4210PD M4250-9G1F-PoE+", description: "3rd party Netgear AV PoE switch with precision Time protocol (needed if using multiple Poly IP mic arrays)" });
    expansionMicOptions.push({ sku: "OR", description: "" });
    expansionMicOptions.push({ sku: "875S1AA", description: skuDescriptions["875S1AA"] || "Poly IP ceiling mic array" });
    expansionMicOptions.push({ sku: "GSM4210PD M4250-9G1F-PoE+", description: "3rd party Netgear AV PoE switch with precision Time protocol (needed if using multiple Poly IP mic arrays)" });
  }
// Expansion mic options table (Windows PC based Large rooms)
if (expansionMic === "Yes" && typeOfSystem === "Windows PC based solution" && roomSize === "Large") {
  expansionMicOptions.push({ sku: "875M6AA", description: "Analog expansion mic for Studio USB/X50/X52/V52/X70/X72/V72" });
  expansionMicOptions.push({ sku: "OR", description: "" });
  expansionMicOptions.push({ sku: "874R3AA", description: skuDescriptions["874R3AA"] || "Poly IP table microphone array" });
  expansionMicOptions.push({ sku: "GSM4210PD M4250-9G1F-PoE+", description: "3rd party Netgear AV PoE switch with precision Time protocol (needed if using multiple Poly IP mic arrays)" });
  expansionMicOptions.push({ sku: "OR", description: "" });
  expansionMicOptions.push({ sku: "875S1AA", description: skuDescriptions["875S1AA"] || "Poly IP ceiling mic array" });
  expansionMicOptions.push({ sku: "GSM4210PD M4250-9G1F-PoE+", description: "3rd party Netgear AV PoE switch with precision Time protocol (needed if using multiple Poly IP mic arrays)" });
}


// Mounting logic (corrected)
if (mounting !== "None") {
  let mountsku = "";
  
  // Determine which product family is being used
  let deviceFamily = "";
  if (typeOfSystem === "Windows PC based solution") {
    if (roomSize === "Small") deviceFamily = "v12";
    else if (roomSize === "Medium") deviceFamily = "V52";
    else if (roomSize === "Large") deviceFamily = "V72";
  }
  if (typeOfSystem === "USB bar only" || typeOfSystem === "Android appliance based room system") {
    if (roomSize === "Small") deviceFamily = "v12";
    else if (roomSize === "Medium") deviceFamily = "X52";
    else if (roomSize === "Large") deviceFamily = "X72";
  }

  // Map mount selection + deviceFamily to SKU
  if (mounting === "Wall") {
    if (deviceFamily === "v12" || deviceFamily === "X32") mountsku = "875L6AA";
    else if (deviceFamily === "X52" || deviceFamily === "V52") mountsku = "875L8AA";
    else if (deviceFamily === "X72" || deviceFamily === "V72") mountsku = ""; // comes with product, no additional SKU
  }
  if (mounting === "VESA style display mount") {
    if (deviceFamily === "v12" || deviceFamily === "X32") mountsku = "875L6AA";
    else if (deviceFamily === "X52" || deviceFamily === "V52") mountsku = "875L9AA";
    else if (deviceFamily === "X72" || deviceFamily === "V72") mountsku = "875L2AA";
  }
  if (mounting === "Table") {
    if (deviceFamily === "v12" || deviceFamily === "X32") mountsku = "875L5AA";
    else if (deviceFamily === "X52" || deviceFamily === "V52") mountsku = "875M0AA";
    else if (deviceFamily === "X72" || deviceFamily === "V72") mountsku = "875L3AA";
  }

  // Add to BOM if applicable
  if (mountsku && skuDescriptions[mountsku]) {
    results.push({ sku: mountsku, description: skuDescriptions[mountsku] });
  }
}


  // Scheduling panel
  if (schedulingPanel === "Yes") {
    const panel = "977L6AA#ABA";
    if (skuDescriptions[panel]) results.push({ sku: panel, description: skuDescriptions[panel] });
  }

  // Accessories
  accessories.forEach(acc => {
    if (skuDescriptions[acc]) results.push({ sku: acc, description: skuDescriptions[acc] });
    else results.push({ sku: acc, description: "(Custom accessory)" });
  });

  // Render BOM table
  const resultDiv = document.getElementById("result");
  if (!results.length) {
    resultDiv.innerHTML = "<p class='italic'>No items selected.</p>";
  } else {
    let html = "<h2 class='font-semibold mb-2'>Your BOM:</h2>";
    html += "<table class='min-w-full border border-gray-300'><thead><tr class='bg-gray-100'><th class='border px-4 py-2 text-left'>SKU</th><th class='border px-4 py-2 text-left'>Description</th></tr></thead><tbody>";
    results.forEach(r => {
      html += `<tr><td class='border px-4 py-2'>${r.sku}</td><td class='border px-4 py-2'>${r.description}</td></tr>`;
    });
    html += "</tbody></table>";
    resultDiv.innerHTML = html;
  }

  // Render Expansion Mic Options table if applicable
  if (expansionMicOptions.length) {
    resultDiv.innerHTML += "<h3 class='font-semibold mt-4 mb-2'>Expansion Mic Options (Choose one):</h3>";
    let micHtml = "<table class='min-w-full border border-gray-300'><thead><tr class='bg-gray-100'><th class='border px-4 py-2 text-left'>SKU</th><th class='border px-4 py-2 text-left'>Description</th></tr></thead><tbody>";
    expansionMicOptions.forEach(r => {
      micHtml += `<tr><td class='border px-4 py-2'>${r.sku}</td><td class='border px-4 py-2'>${r.description}</td></tr>`;
    });
    micHtml += "</tbody></table>";
    resultDiv.innerHTML += micHtml;
  }
}

window.onload = init;
