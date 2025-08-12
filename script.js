// script.js v9.18 – merged data + optional MSRP column

document.title = 'Poly Video Conferencing "Bill" of Materials Generator v9.18';

async function init() {
  try {
    // Load merged data (description + msrp)
    const res = await fetch('skus_merged.json');
    if (!res.ok) throw new Error(`Failed to load skus_merged.json (${res.status})`);
    const skuMap = await res.json(); // { "SKU": { description: "...", msrp: "$..." }, ... }

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
    form.innerHTML += select("implementationHelp", "Do you need Poly implementation help?", ["None","Remote Implementation help","Onsite Implementation help"]);

    // ✅ Include prices toggle (default unchecked)
    form.innerHTML += `
      <div class="flex items-center gap-2">
        <input id="includePrices" type="checkbox" class="h-4 w-4 border-gray-300 rounded">
        <label for="includePrices" class="text-sm">Include prices (MSRP)</label>
      </div>
    `;

    form.innerHTML += `<div id="extraQuestions"></div>`;
    form.innerHTML += `<div><label class="block font-medium">Any 3rd party or other line items you want included in the BOM (comma-separated)</label>
<input id="accessories" class="border p-2 w-full" placeholder="e.g. Shure P300 DSP, 3rd party powered speaker, extra Poly E60/E70 Camera or mics, Remote control"/></div>`;

    form.innerHTML += `<button type="button" id="generateBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Generate BOM</button>
      <div id="result" class="mt-6"></div>`;

    app.innerHTML = "";
    app.appendChild(form);

    document.getElementById("roomSize").addEventListener("change", () => showExtraQuestions());
    document.getElementById("typeOfSystem").addEventListener("change", () => showExtraQuestions());
    document.getElementById("generateBtn").addEventListener("click", () => generate(skuMap));

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
    document.getElementById("app").innerHTML = "<p class='text-red-600'>Failed to load skus_merged.json.</p>";
    console.error(e);
  }
}

function generate(skuMap) {
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
  const implementationHelp = document.getElementById("implementationHelp").value;
  const includePrices = document.getElementById("includePrices").checked;

  // Helpers for data / pricing
  const missLog = new Set(); const MISS_LOG_LIMIT = 10;
  const normalizeSku = s => (s ? String(s).trim().toUpperCase() : '');
  const stripHashSuffix = s => { const i = s.indexOf('#'); return i >= 0 ? s.slice(0, i) : s; };

  function msrpFor(sku) {
    if (!includePrices) return undefined; // short-circuit if user didn't opt-in
    let k = normalizeSku(sku);
    if (skuMap[k]?.msrp) return skuMap[k].msrp;
    const noHash = stripHashSuffix(k);
    if (skuMap[noHash]?.msrp) return skuMap[noHash].msrp;
    if (missLog.size < MISS_LOG_LIMIT) missLog.add(k);
    return undefined;
  }

  function descFor(sku, fallback) {
    let k = normalizeSku(sku);
    if (skuMap[k]?.description) return skuMap[k].description;
    const noHash = stripHashSuffix(k);
    if (skuMap[noHash]?.description) return skuMap[noHash].description;
    return fallback || "";
  }

  function fmtPrice(value) {
    if (!includePrices) return ''; // no column when disabled; this is only used when enabled
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'number') return `$${value.toFixed(2)}`;
    const num = Number(String(value).replace(/[^0-9.]/g, ''));
    if (Number.isFinite(num)) return `$${num.toFixed(2)}`;
    return '—';
  }

  // ===== Selection logic (same as your working version) =====

  // Prevent USB bar for very large rooms
  if (typeOfSystem === "USB bar only" && roomSize.includes("Very large")) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "<p class='italic text-red-600'>USB bar not recommended to very large room, but you could use a G62 in device mode potentially. Please select a different system type.</p>";
    return;
  }

  // Very Large + Android
  if (roomSize.includes("Very large") && typeOfSystem === "Android appliance based room system") {
    const g62sku = "A01KCAA#AC3";
    results.push({ sku: g62sku, description: descFor(g62sku) });

    const tc10sku = "977L6AA#ABA";
    results.push({ sku: tc10sku, description: descFor(tc10sku) });

    if (supportTerm !== "None") {
      const tc10support = supportTerm === "3yr" ? "P37760312" : "P37760112";
      const g62support = supportTerm === "3yr" ? "U77D3PV" : "U86WDPV";
      results.push({ sku: tc10support, description: descFor(tc10support) });
      results.push({ sku: g62support, description: descFor(g62support) });
    }

    if (externalCamera === "Poly E70 Camera") {
      const e70sku = "842F8AA";
      results.push({ sku: e70sku, description: descFor(e70sku) });
      if (supportTerm !== "None") {
        const e70support = supportTerm === "3yr" ? "P87090312" : "P87090112";
        results.push({ sku: e70support, description: descFor(e70support) });
      }
    }
    if (externalCamera === "Poly E60 Camera") {
      const e60sku = "9W1A6AA#AC3";
      results.push({ sku: e60sku, description: descFor(e60sku) });
      if (supportTerm !== "None") {
        const e60support = supportTerm === "3yr" ? "U86LDPV" : "U86LCPV";
        results.push({ sku: e60support, description: descFor(e60support) });
      }
    }

    if (largeRoomAudio === "Poly IP Ceiling mic array") {
      const ceiling = "875S1AA";
      results.push({ sku: ceiling, description: descFor(ceiling) });
      results.push({ sku: "GSM4210PD M4250-9G1F-PoE+", description: "3rd party Netgear AV PoE switch with precision Time protocol (needed if using multiple Poly IP mic arrays)" });
    }
    if (largeRoomAudio === "Poly IP Table mic array") {
      const table = "874R3AA";
      results.push({ sku: table, description: descFor(table) });
      results.push({ sku: "GSM4210PD M4250-9G1F-PoE+", description: "3rd party Netgear AV PoE switch with precision Time protocol (needed if using multiple Poly IP mic arrays)" });
    }
    if (largeRoomAudio === "Add Poly Trio C60 with Expansion mic kit as Audio") {
      const trio = "849B6AA#ABA";
      const trioKit = "85X02AA";
      results.push({ sku: trio, description: descFor(trio) });
      results.push({ sku: trioKit, description: descFor(trioKit) });
      if (supportTerm !== "None") {
        const trioSupport = supportTerm === "3yr" ? "P86240312" : "P86240112";
        results.push({ sku: trioSupport, description: descFor(trioSupport) });
      }
    }
  }

  // Android appliance general
  if (typeOfSystem === "Android appliance based room system") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") {
      prodSku = "A3SV5AA#ABA";
      supportSku = supportTerm === "3yr" ? "UE1Q9PV" : "UE1Q8PV";
      const poeInjector = "B5NH6AA";
      const tc10 = "977L6AA#ABA";
      const tc10support = supportTerm === "3yr" ? "P37760312" : "P37760112";
      results.push({ sku: poeInjector, description: descFor(poeInjector) });
      results.push({ sku: tc10, description: descFor(tc10) });
      if (supportTerm !== "None") results.push({ sku: tc10support, description: descFor(tc10support) });

    } else if (roomSize === "Medium") {
      prodSku = "8D8L1AA#ABA";
      supportSku = supportTerm === "3yr" ? "P87625312" : "P87625112";
      if (expansionMic === "Yes") results.push({ sku: "875M6AA", description: descFor("875M6AA") });

    } else if (roomSize === "Large") {
      prodSku = "A4MA7AA#ABA";
      supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98SXPV";
    }

    if (prodSku) results.push({ sku: prodSku, description: descFor(prodSku) });
    if (supportTerm !== "None" && supportSku) results.push({ sku: supportSku, description: descFor(supportSku) });
  }

  // USB bar only
  if (typeOfSystem === "USB bar only") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") {
      prodSku = "A9DD8AA#ABA";
      supportSku = supportTerm === "3yr" ? "UE1X7PV" : "UE1X6PV";
      const poeInjector = "B5NH6AA";
      results.push({ sku: poeInjector, description: descFor(poeInjector) });
    } else if (roomSize === "Medium") {
      prodSku = "A09D4AA#ABA";
      supportSku = supportTerm === "3yr" ? "U86MQPV" : "U86MNPV";
    } else if (roomSize === "Large") {
      prodSku = "AV1E3AA#ABA";
      supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98X0PV";
    }

    if (prodSku) results.push({ sku: prodSku, description: descFor(prodSku) });
    if (supportTerm !== "None" && supportSku) results.push({ sku: supportSku, description: descFor(supportSku) });

    if ((roomSize === "Medium" || roomSize === "Large") && expansionMic === "Yes") {
      results.push({ sku: "875M6AA", description: descFor("875M6AA") });
    }
  }

  // Windows PC based solution
  if (typeOfSystem === "Windows PC based solution") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") {
      prodSku = "A9DD8AA#ABA";
      supportSku = supportTerm === "3yr" ? "UE1X7PV" : "UE1X6PV";
      results.push({ sku: "B5NH6AA", description: descFor("B5NH6AA") });
    } else if (roomSize === "Medium") {
      prodSku = "A09D4AA#ABA";
      supportSku = supportTerm === "3yr" ? "U86MQPV" : "U86MNPV";
      if (expansionMic === "Yes") results.push({ sku: "875M6AA", description: descFor("875M6AA") });
    } else if (roomSize === "Large" || roomSize.includes("Very large")) {
      prodSku = "AV1E3AA#ABA";
      supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98X0PV";
    }

    if (prodSku) results.push({ sku: prodSku, description: descFor(prodSku) });
    if (supportTerm !== "None" && supportSku) results.push({ sku: supportSku, description: descFor(supportSku) });

    // Platform kits
    if (platform !== "Google Meet") {
      if (platform === "Zoom") {
        let zoomSku = "", zoomSupport = "";
        if (roomSize === "Small") { zoomSku = "9D9R3AA"; zoomSupport = supportTerm === "3yr" ? "P88140312" : "P88140112"; }
        else if (roomSize === "Medium") { zoomSku = "9D9R1AA"; zoomSupport = supportTerm === "3yr" ? "P88150312" : "P88150112"; }
        else if (roomSize === "Large" || roomSize.includes("Very large")) { zoomSku = "9D9Q9AA"; zoomSupport = supportTerm === "3yr" ? "P88160312" : "P88160112"; }
        if (zoomSku) results.push({ sku: zoomSku, description: descFor(zoomSku) });
        if (supportTerm !== "None" && zoomSupport) results.push({ sku: zoomSupport, description: descFor(zoomSupport) });
      } else {
        const mtrSku = "A3LU8AA#ABA";
        results.push({ sku: mtrSku, description: descFor(mtrSku) });
        if (supportTerm !== "None") {
          const mtrSupport = supportTerm === "3yr" ? "U95J9PV" : "U95J8PV";
          results.push({ sku: mtrSupport, description: descFor(mtrSupport) });
        }
      }
    }
  }

  // Mounting logic
  if (mounting !== "None") {
    let mountsku = "";
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

    if (mounting === "Wall") {
      if (deviceFamily === "v12" || deviceFamily === "X32") mountsku = "875L6AA";
      else if (deviceFamily === "X52" || deviceFamily === "V52") mountsku = "875L8AA";
      else if (deviceFamily === "X72" || deviceFamily === "V72") mountsku = ""; // included
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

    if (mountsku) results.push({ sku: mountsku, description: descFor(mountsku) });
  }

  // Scheduling panel
  if (schedulingPanel === "Yes") {
    const panel = "977L6AA#ABA";
    results.push({ sku: panel, description: descFor(panel) });
    if (supportTerm !== "None") {
      const panelSupport = supportTerm === "3yr" ? "P37760312" : "P37760112";
      results.push({ sku: panelSupport, description: descFor(panelSupport) });
    }
  }

  // Accessories (allow custom)
  accessories.forEach(acc => {
    if (!acc) return;
    const hasDesc = descFor(acc, "");
    results.push({ sku: acc, description: hasDesc || "(Custom accessory)" });
  });

  // Render
  const resultDiv = document.getElementById("result");
  if (!results.length) {
    resultDiv.innerHTML = "<p class='italic'>No items selected.</p>";
  } else {
    let html = `
      <p class='text-sm italic text-gray-600 mb-2'>
        Disclaimer: Generated with AI, subject to errors. Not an official HP tool.
      </p>
      <p class='text-sm mb-3'>
        <a class="underline text-blue-700" href="https://docs.google.com/presentation/d/1gIB--U2tGHcWaI1DXk4ovZVH9pme3rUD/edit?usp=sharing&ouid=104449332556651601678&rtpof=true&sd=true" target="_blank" rel="noopener">For additional Quoting Guide information</a>
      </p>
      <p class='text-sm mb-4'>
        See additional solution wiring diagrams and solution selector with
        <a class="underline text-blue-700" href="https://www.hp.com/us-en/poly/spaces.html" target="_blank" rel="noopener">Poly Spaces</a>.
      </p>
      <h2 class='font-semibold mb-2'>Your BOM:</h2>
    `;

    // Build table (conditionally include MSRP column)
    html += `<table class='min-w-full border border-gray-300'>
      <thead><tr class='bg-gray-100'>
        <th class='border px-4 py-2 text-left'>SKU</th>
        <th class='border px-4 py-2 text-left'>Description</th>
        ${includePrices ? "<th class='border px-4 py-2 text-left'>MSRP</th>" : ""}
      </tr></thead><tbody>`;

    results.forEach(r => {
      html += `<tr>
        <td class='border px-4 py-2'>${r.sku}</td>
        <td class='border px-4 py-2'>${r.description}</td>
        ${includePrices ? `<td class='border px-4 py-2'>${fmtPrice(msrpFor(r.sku))}</td>` : ""}
      </tr>`;
    });

    html += "</tbody></table>";
    resultDiv.innerHTML = html;

    // Expansion mic options table – only render if there are any options
    if (expansionMicOptions.length) {
      let micHtml = "<h3 class='font-semibold mt-4 mb-2'>Expansion Mic Options (Choose one):</h3>";
      micHtml += `<table class='min-w-full border border-gray-300'>
        <thead><tr class='bg-gray-100'>
          <th class='border px-4 py-2 text-left'>SKU</th>
          <th class='border px-4 py-2 text-left'>Description</th>
          ${includePrices ? "<th class='border px-4 py-2 text-left'>MSRP</th>" : ""}
        </tr></thead><tbody>`;

      expansionMicOptions.forEach(r => {
        micHtml += `<tr>
          <td class='border px-4 py-2'>${r.sku}</td>
          <td class='border px-4 py-2'>${r.description}</td>
          ${includePrices ? `<td class='border px-4 py-2'>${fmtPrice(msrpFor(r.sku))}</td>` : ""}
        </tr>`;
      });

      micHtml += "</tbody></table>";
      resultDiv.innerHTML += micHtml;
    }

    // Light console hint for missing prices when enabled
    if (includePrices && missLog.size) {
      console.warn('[MSRP] Missing price for SKUs (first few):', Array.from(missLog));
    }
  }
}

window.onload = init;
