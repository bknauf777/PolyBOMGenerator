// script.js v9.13.1 FINAL – Fully integrated build

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

  // All system type mappings
  if (typeOfSystem === "Android appliance based room system") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") { prodSku = "A3SV5AA#ABA"; supportSku = supportTerm === "3yr" ? "UE1Q9PV" : "UE1Q8PV"; }
    else if (roomSize === "Medium") { prodSku = "8D8L1AA#ABA"; supportSku = supportTerm === "3yr" ? "P87625312" : "P87625112"; }
    else if (roomSize === "Large") { prodSku = "A4MA7AA#ABA"; supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98SXPV"; }

    if (skuDescriptions[prodSku]) results.push({ sku: prodSku, description: skuDescriptions[prodSku] });
    if (skuDescriptions[supportSku]) results.push({ sku: supportSku, description: skuDescriptions[supportSku] });
  }

  if (typeOfSystem === "USB bar only") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") { prodSku = "A9DD8AA#ABA"; supportSku = supportTerm === "3yr" ? "UE1X7PV" : "UE1X6PV"; }
    else if (roomSize === "Medium") { prodSku = "A09D4AA#ABA"; supportSku = supportTerm === "3yr" ? "U86MQPV" : "U86MNPV"; }
    else if (roomSize === "Large") { prodSku = "AV1E3AA#ABA"; supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98X0PV"; }

    if (skuDescriptions[prodSku]) results.push({ sku: prodSku, description: skuDescriptions[prodSku] });
    if (skuDescriptions[supportSku]) results.push({ sku: supportSku, description: skuDescriptions[supportSku] });
  }

  if (typeOfSystem === "Windows PC based solution") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") { prodSku = "999V12N"; supportSku = supportTerm === "3yr" ? "UE1X7PV" : "UE1X6PV"; }
    else if (roomSize === "Medium") { prodSku = "A09D4AA#ABA"; supportSku = supportTerm === "3yr" ? "U86MQPV" : "U86MNPV"; }
    else if (roomSize === "Large") { prodSku = "AV1E3AA#ABA"; supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98X0PV"; }

    if (skuDescriptions[prodSku]) results.push({ sku: prodSku, description: skuDescriptions[prodSku] });
    if (skuDescriptions[supportSku]) results.push({ sku: supportSku, description: skuDescriptions[supportSku] });

    const mtrSku = "A3LU8AA#ABA";
    const mtrSupport = supportTerm === "3yr" ? "U95J9PV" : "U95J8PV";
    if (skuDescriptions[mtrSku]) results.push({ sku: mtrSku, description: skuDescriptions[mtrSku] });
    if (skuDescriptions[mtrSupport]) results.push({ sku: mtrSupport, description: skuDescriptions[mtrSupport] });
  }

  // Mounting
  if (mounting !== "None") {
    const mountsku = "875L6AA"; // Placeholder; integrate your mapping matrix here
    if (skuDescriptions[mountsku]) results.push({ sku: mountsku, description: skuDescriptions[mountsku] });
  }

  // Expansion mic
  if (expansionMic === "Yes") {
    const mic = "875M6AA";
    if (skuDescriptions[mic]) results.push({ sku: mic, description: skuDescriptions[mic] });
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

  // Render
  const resultDiv = document.getElementById("result");
  if (!results.length) {
    resultDiv.innerHTML = "<p class='italic'>No items selected.</p>";
  } else {
    resultDiv.innerHTML = "<h2 class='font-semibold mb-2'>Your BOM:</h2>";
    const ul = document.createElement("ul");
    ul.className = "list-disc pl-5";
    results.forEach(r => {
      const li = document.createElement("li");
      li.textContent = `${r.sku}: ${r.description}`;
      ul.appendChild(li);
    });
    resultDiv.appendChild(ul);
  }
}

window.onload = init;
