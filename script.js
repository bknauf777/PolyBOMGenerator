// script.js – merged-catalog build with pricing toggle, implementation help, and large-room mic options

document.title = 'Poly Video Conferencing "Bill" of Materials Generator v9.17';

async function init() {
  try {
    // Load merged catalog (sku -> { description, msrp })
    const res = await fetch('skus_merged.json');
    const catalog = await res.json();

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

    function checkbox(id, label, checked=false) {
      return `<div class="flex items-center gap-2">
        <input type="checkbox" id="${id}" ${checked ? "checked" : ""} class="h-4 w-4 border rounded">
        <label for="${id}" class="font-medium select-none">${label}</label>
      </div>`;
    }

    form.innerHTML += select("typeOfSystem", "Type of System", ["USB bar only","Windows PC based solution","Android appliance based room system"]);
    form.innerHTML += select("platform", "Select Primary Platform", ["Zoom","Microsoft Teams","Google Meet"]);
    form.innerHTML += select("roomSize", "Room Size", ["Small","Medium","Large","Very large space, >25’ from front of room to furthest person, too big for all-in-one bar."]);
    form.innerHTML += select("mounting", "Select add-on Mounting option", ["None","Wall","VESA style display mount","Table"]);
    form.innerHTML += select("expansionMic", "Include Expansion Mic?", ["None","Yes"]);
    form.innerHTML += select("schedulingPanel", "Include additional TC10 to use as scheduling panel outside room?", ["None","Yes"]);
    form.innerHTML += select("supportTerm", "Select Support Term", ["None","1yr","3yr"]);
    form.innerHTML += select("implementationHelp", "Do you need Poly implementation help?", ["None","Remote Implementation help","Onsite Implementation help"]);
    form.innerHTML += checkbox("includePrices", "Include MSRP prices", false);

    form.innerHTML += `<div id="extraQuestions"></div>`;
    form.innerHTML += `<div><label class="block font-medium">Any 3rd party or other line items you want included in the BOM (comma-separated)</label>
<input id="accessories" class="border p-2 w-full" placeholder="e.g. Shure P300 DSP, 3rd party powered speaker, extra Poly E60/E70 Camera or mics, Remote control"/></div>`;

    form.innerHTML += `<button type="button" id="generateBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Generate BOM</button>
      <div id="result" class="mt-6"></div>`;

    app.innerHTML = "";
    app.appendChild(form);

    document.getElementById("roomSize").addEventListener("change", () => showExtraQuestions());
    document.getElementById("typeOfSystem").addEventListener("change", () => showExtraQuestions());
    document.getElementById("generateBtn").addEventListener("click", () => generate(catalog));

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

function generate(catalog) {
  const includePrices = document.getElementById("includePrices").checked;
  const results = [];
  const expansionMicOptions = [];

  // Helpers
  const getItem = sku => catalog[sku] || catalog[sku?.trim()] || null;
  const getMsrp = sku => {
    const item = getItem(sku);
    return item?.msrp || null; // keep as string like "$699.95" if present
  };
  const msrpCell = sku => {
    const m = getMsrp(sku);
    return m ? m : "—";
  };
  const addLine = (arr, sku, fallbackDesc="(Custom item)") => {
    const item = getItem(sku);
    arr.push({
      sku,
      description: item?.description || fallbackDesc,
      msrp: item?.msrp ?? null
    });
  };

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

  // 🚫 Prevent USB bar only selection for very large rooms
  if (typeOfSystem === "USB bar only" && roomSize.includes("Very large")) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "<p class='italic text-red-600'>USB bar not recommended to very large room, but you could use a G62 in device mode potentially. Please select a different system type.</p>";
    return;
  }

  // Very Large room + Android logic (G62 flow)
  if (roomSize.includes("Very large") && typeOfSystem === "Android appliance based room system") {
    addLine(results, "A01KCAA#AC3"); // G62 base
    addLine(results, "977L6AA#ABA"); // TC10
    const tc10support = supportTerm === "3yr" ? "P37760312" : "P37760112";
    if (supportTerm !== "None") addLine(results, tc10support);
    const g62support = supportTerm === "3yr" ? "U77D3PV" : "U86WDPV";
    if (supportTerm !== "None") addLine(results, g62support);

    if (externalCamera === "Poly E70 Camera") {
      addLine(results, "842F8AA");
      const e70support = supportTerm === "3yr" ? "P87090312" : "P87090112";
      if (supportTerm !== "None") addLine(results, e70support);
    }
    if (externalCamera === "Poly E60 Camera") {
      addLine(results, "9W1A6AA#AC3");
      const e60support = supportTerm === "3yr" ? "U86LDPV" : "U86LCPV";
      if (supportTerm !== "None") addLine(results, e60support);
    }

    if (largeRoomAudio === "Poly IP Ceiling mic array") {
      addLine(results, "875S1AA");
      addLine(results, "GSM4210PD M4250-9G1F-PoE+", "3rd party Netgear AV PoE switch with PTP");
    }
    if (largeRoomAudio === "Poly IP Table mic array") {
      addLine(results, "874R3AA");
      addLine(results, "GSM4210PD M4250-9G1F-PoE+", "3rd party Netgear AV PoE switch with PTP");
    }
    if (largeRoomAudio === "Add Poly Trio C60 with Expansion mic kit as Audio") {
      addLine(results, "849B6AA#ABA");
      addLine(results, "85X02AA");
      const trioSupport = supportTerm === "3yr" ? "P86240312" : "P86240112";
      if (supportTerm !== "None") addLine(results, trioSupport);
    }
  }

  // General product SKU logic for all system types
  if (typeOfSystem === "Android appliance based room system") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") {
      prodSku = "A3SV5AA#ABA";
      supportSku = supportTerm === "3yr" ? "UE1Q9PV" : "UE1Q8PV";
      addLine(results, "B5NH6AA", "PoE power injector for X32/V12");
      addLine(results, "977L6AA#ABA"); // TC10
      const tc10support = supportTerm === "3yr" ? "P37760312" : "P37760112";
      if (supportTerm !== "None") addLine(results, tc10support);
    } else if (roomSize === "Medium") {
      prodSku = "8D8L1AA#ABA";
      supportSku = supportTerm === "3yr" ? "P87625312" : "P87625112";
    } else if (roomSize === "Large") {
      prodSku = "A4MA7AA#ABA";
      supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98SXPV";
    }
    if (prodSku) addLine(results, prodSku);
    if (supportTerm !== "None" && supportSku) addLine(results, supportSku);
  }

  if (typeOfSystem === "USB bar only") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") {
      prodSku = "A9DD8AA#ABA";
      supportSku = supportTerm === "3yr" ? "UE1X7PV" : "UE1X6PV";
      addLine(results, "B5NH6AA", "PoE power injector for X32/V12");
    } else if (roomSize === "Medium") {
      prodSku = "A09D4AA#ABA";
      supportSku = supportTerm === "3yr" ? "U86MQPV" : "U86MNPV";
    } else if (roomSize === "Large") {
      prodSku = "AV1E3AA#ABA";
      supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98X0PV";
    }
    if (prodSku) addLine(results, prodSku);
    if (supportTerm !== "None" && supportSku) addLine(results, supportSku);

    // Expansion mic direct add for Medium/Large when "Yes"
    if ((roomSize === "Medium" || roomSize === "Large") && expansionMic === "Yes") {
      addLine(results, "875M6AA");
    }
  }

  if (typeOfSystem === "Windows PC based solution") {
    let prodSku = "", supportSku = "";
    if (roomSize === "Small") {
      prodSku = "A9DD8AA#ABA";
      supportSku = supportTerm === "3yr" ? "UE1X7PV" : "UE1X6PV";
      addLine(results, "B5NH6AA", "PoE power injector for X32/V12");
    } else if (roomSize === "Medium") {
      prodSku = "A09D4AA#ABA";
      supportSku = supportTerm === "3yr" ? "U86MQPV" : "U86MNPV";
      if (expansionMic === "Yes") addLine(results, "875M6AA");
    } else if (roomSize === "Large" || roomSize.includes("Very large")) {
      prodSku = "AV1E3AA#ABA";
      supportSku = supportTerm === "3yr" ? "U98X1PV" : "U98X0PV";
    }
    if (prodSku) addLine(results, prodSku);
    if (supportTerm !== "None" && supportSku) addLine(results, supportSku);

    // MTR base kit only when platform ≠ Google Meet
    if (platform !== "Google Meet") {
      if (platform === "Zoom") {
        let zoomSku = "", zoomSupport = "";
        if (roomSize === "Small") {
          zoomSku = "9D9R3AA";
          zoomSupport = supportTerm === "3yr" ? "P88140312" : "P88140112";
        } else if (roomSize === "Medium") {
          zoomSku = "9D9R1AA";
          zoomSupport = supportTerm === "3yr" ? "P88150312" : "P88150112";
        } else if (roomSize === "Large" || roomSize.includes("Very large")) {
          zoomSku = "9D9Q9AA";
          zoomSupport = supportTerm === "3yr" ? "P88160312" : "P88160112";
        }
        if (zoomSku) addLine(results, zoomSku);
        if (supportTerm !== "None" && zoomSupport) addLine(results, zoomSupport);
      } else {
        const mtrSku = "A3LU8AA#ABA";
        const mtrSupport = supportTerm === "3yr" ? "U95J9PV" : "U95J8PV";
        addLine(results, mtrSku, "Poly MTR Windows G9Plus Base Room kit (MTR PC + TC10 touch control) Need to Add camera/audio");
        if (supportTerm !== "None") addLine(results, mtrSupport);
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
    if (mountsku) addLine(results, mountsku);
  }

  // Scheduling panel
  if (schedulingPanel === "Yes") {
    addLine(results, "977L6AA#ABA");
    const panelSupport = supportTerm === "3yr" ? "P37760312" : "P37760112";
    if (supportTerm !== "None") addLine(results, panelSupport);
  }

  // Accessories
  accessories.forEach(acc => addLine(results, acc, "(Custom accessory)"));

  // === Implementation help SKUs ===
  if (implementationHelp === "Remote Implementation help" || implementationHelp === "Onsite Implementation help") {
    let remoteSku = "";
    const onsiteSku = "PROSMTHND04";

    if (typeOfSystem === "Windows PC based solution") {
      remoteSku = "PROECOSYS02";
    } else if (typeOfSystem === "Android appliance based room system" && roomSize.includes("Very large")) {
      remoteSku = "PROG7500RE2";
    } else if (typeOfSystem === "USB bar only" || typeOfSystem === "Android appliance based room system") {
      remoteSku = "PROSTDIOXR2";
    }
    if (remoteSku) addLine(results, remoteSku);
    if (implementationHelp === "Onsite Implementation help") addLine(results, onsiteSku);
  }

  // === Unified Expansion Mic Options table for Large rooms ===
  if (expansionMic === "Yes" && roomSize === "Large") {
    const pushLine = (sku, fallback="") => {
      const item = getItem(sku);
      expansionMicOptions.push({
        sku,
        description: item?.description || fallback,
        msrp: item?.msrp ?? null
      });
    };

    // Analog path
    pushLine("875M6AA", "Analog expansion mic for Studio USB/X50/X52/V52/X70/X72/V72");
    expansionMicOptions.push({ sku: "OR", description: "", msrp: null });

    // IP table mic array path
    pushLine("874R3AA", "Poly IP table microphone array");
    pushLine("GSM4210PD M4250-9G1F-PoE+", "3rd party Netgear AV PoE switch with precision Time protocol (needed if using multiple Poly IP mic arrays)");
    expansionMicOptions.push({ sku: "OR", description: "", msrp: null });

    // IP ceiling mic array path
    pushLine("875S1AA", "Poly IP ceiling mic array");
    pushLine("GSM4210PD M4250-9G1F-PoE+", "3rd party Netgear AV PoE switch with precision Time protocol (needed if using multiple Poly IP mic arrays)");
  }

  // Render
  const resultDiv = document.getElementById("result");
  if (!results.length) {
    resultDiv.innerHTML = "<p class='italic'>No items selected.</p>";
    return;
  }

  let html = `
<p class='text-sm italic text-gray-600 mb-2'>Disclaimer: Generated with AI, subject to errors. Not an official HP tool.</p>
<p class='text-sm mb-4'>
  <a href="https://docs.google.com/presentation/d/1gIB--U2tGHcWaI1DXk4ovZVH9pme3rUD/edit?usp=sharing&ouid=104449332556651601678&rtpof=true&sd=true" target="_blank" class="text-blue-600 underline">For additional Quoting Guide information</a>
</p>
<p class='text-sm mb-4'>
  See additional solution wiring diagrams and solution selector with
  <a href="https://www.hp.com/us-en/poly/spaces.html" target="_blank" class="text-blue-600 underline">Poly Spaces</a>.
</p>
<h2 class='font-semibold mb-2'>Your BOM:</h2>`;

  // BOM table
  html += `<table class='min-w-full border border-gray-300'>
    <thead>
      <tr class='bg-gray-100'>
        <th class='border px-4 py-2 text-left'>SKU</th>
        <th class='border px-4 py-2 text-left'>Description</th>
        ${includePrices ? "<th class='border px-4 py-2 text-left'>MSRP</th>" : ""}
      </tr>
    </thead><tbody>`;

  results.forEach(r => {
    html += `<tr>
      <td class='border px-4 py-2 align-top'>${r.sku}</td>
      <td class='border px-4 py-2 align-top'>${r.description}</td>
      ${includePrices ? `<td class='border px-4 py-2 align-top'>${r.msrp || "—"}</td>` : ""}
    </tr>`;
  });
  html += "</tbody></table>";

  resultDiv.innerHTML = html;

  // Expansion Mic Options (optional table)
  if (expansionMicOptions.length) {
    let micHtml = "<h3 class='font-semibold mt-4 mb-2'>Expansion Mic Options (Choose one):</h3>";
    micHtml += `<table class='min-w-full border border-gray-300'>
      <thead>
        <tr class='bg-gray-100'>
          <th class='border px-4 py-2 text-left'>SKU</th>
          <th class='border px-4 py-2 text-left'>Description</th>
          ${includePrices ? "<th class='border px-4 py-2 text-left'>MSRP</th>" : ""}
        </tr>
      </thead><tbody>`;
    expansionMicOptions.forEach(r => {
      micHtml += `<tr>
        <td class='border px-4 py-2 align-top'>${r.sku}</td>
        <td class='border px-4 py-2 align-top'>${r.description}</td>
        ${includePrices ? `<td class='border px-4 py-2 align-top'>${r.msrp || "—"}</td>` : ""}
      </tr>`;
    });
    micHtml += "</tbody></table>";
    resultDiv.innerHTML += micHtml;
  }
}

window.onload = init;
