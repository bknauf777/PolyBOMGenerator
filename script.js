// script.js – HP | Poly Configurator – v9.36

document.title = 'Poly Video Conferencing "Bill" of Materials Generator v9.61';

async function init() {
  try {
    // Load SKU catalog
    const res = await fetch('skus_merged.json');
    if (!res.ok) throw new Error(`Failed to load skus_merged.json (${res.status})`);
    const catalog = await res.json();
    console.log('Catalog loaded:', Object.keys(catalog).length, 'SKUs');

    // ------------- Helpers -------------
    const getItem = sku => catalog[sku] || null;
    const addLine = (arr, sku, fallbackDesc="(Custom item)", qty=1) => {
      const item = getItem(sku);
      const existing = arr.find(x => x.sku === sku);
      if (existing) { existing.quantity = (existing.quantity || 1) + qty; return; }
      arr.push({ sku, description: item?.description || fallbackDesc, msrp: item?.msrp ?? "", quantity: qty });
    };
    const hasSku = (arr, sku) => arr.some(x => x.sku === sku);
    const fmt = v => (v ?? "") || "—";

    // ------------- UI -------------
    const app = document.getElementById("app");
    app.innerHTML = "";
    const form = document.createElement("form");
    form.className = "space-y-4";

    const select = (id, label, options) => {
      const wrap = document.createElement("div");
      const normalized = (Array.isArray(options) ? options : []).map(o => {
        if (typeof o === "string") return { value: o, label: o };
        if (o && typeof o === "object") return { value: String(o.value ?? ""), label: String(o.label ?? o.value ?? "") };
        return { value: String(o), label: String(o) };
      });
      const optsHtml = normalized.map(({value,label}) => `<option value="${value}">${label}</option>`).join("");
      wrap.innerHTML = `<label class="block font-medium">${label}</label>
      <select id="${id}" class="border p-2 w-full"><option value="">--</option>
        ${optsHtml}
      </select>`;
      return wrap;
    };

    const input = (id, label, placeholder="") => {
      const wrap = document.createElement("div");
      wrap.innerHTML = `<label class="block font-medium">${label}</label>
        <input id="${id}" class="border p-2 w-full" placeholder="${placeholder}"/>`;
      return wrap;
    };

    // Core selectors
    form.appendChild(select("typeOfSystem", "Select System Type", [
      "USB bar only",
      "Windows PC based solution",
      "Android appliance based solution"
    ]));
    form.appendChild(select("platform", "Select Primary Platform", [
      "Zoom","Microsoft Teams","Google Meet"
    ]));
    form.appendChild(select("roomSize", "Select Room Size", ["Small","Medium","Large",{value:"Very large",label:"Very Large room. Distance of > 25\' from front of room to furthest person to cover"}]));
    form.appendChild(select("mounting", "Select Mounting option", [
      "None","Wall","VESA style display mount","Table"
    ]));

    // Expansion mic + A2 qty
    const expWrap = select("expansionMic", "Include Expansion Mic?", [
      "None",
      "Single Analog Exp mic",
      "Existing IP table mics",
      "Existing IP Ceiling mics",
      "New White A2 table mic pod(s) (not shipping yet)",
      "New Black A2 table mic pod(s) (not shipping yet)"
    ]);
    form.appendChild(expWrap);
    const expansionInfo = document.createElement("div");
    expansionInfo.id = "expansionInfo";
    expansionInfo.className = "hidden text-sm mt-1 p-2 border-l-4 border-amber-400 bg-amber-50 text-amber-900 rounded";
    expansionInfo.textContent = "Note: IP table/ceiling mics are not supported with V12, X32, X52, or V52. Use Analog or A2 mics.";
    form.appendChild(expansionInfo);

    const a2QtyWrap = document.createElement("div");
    a2QtyWrap.id = "a2QtyWrapper";
    a2QtyWrap.className = "hidden";
    a2QtyWrap.innerHTML = `<label class="block font-medium">Number of A2 mic pods (1–8)</label>
      <input id="a2Qty" type="number" min="1" max="8" value="1" class="border p-2 w-full" />`;
    form.appendChild(a2QtyWrap);

// Camera (for G62 Very Large Android)
const camWrap = document.createElement("div");
camWrap.id = "cameraWrap";
camWrap.className = "hidden";
camWrap.innerHTML = `<label class="block font-medium">Select Camera (for G62 very large rooms)</label>
<select id="cameraChoice" class="border p-2 w-full">
  <option value="None">None</option>
  <option value="E60">Poly E60 (9W1A6AA#AC3)</option>
  <option value="E70">Poly E70 (842F8AA)</option>
</select>`;
form.appendChild(camWrap);


    form.appendChild(select("schedulingPanel", "Include additional TC10 to use as scheduling panel outside room?", [
      "None","Yes"
    ]));
    form.appendChild(select("supportTerm", "Select Support term", [
      "None","1yr","3yr"
    ]));
    form.appendChild(select("implementationHelp", "Implementation Help", [
      "None", "Remote Implementation help", "Onsite Implementation help"
    ]));
    form.appendChild(input("accessories", "Optional: any additional accessories (comma-separated SKUs)", "e.g. cables, plates"));

    const priceWrap = document.createElement("div");
    priceWrap.innerHTML = `<label class="inline-flex items-center gap-2">
      <input id="includePrices" type="checkbox" class="border" /> Include Prices (MSRP)
    </label>`;
    form.appendChild(priceWrap);

    // Inline platform note (Windows PC + Google Meet)
    const platformInfo = document.createElement("div");
    platformInfo.id = "platformInfo";
    platformInfo.className = "hidden text-sm mt-1 p-2 border-l-4 border-amber-400 bg-amber-50 text-amber-900 rounded";
    platformInfo.textContent = "HP Poly does not currently offer a Google Meets imaged PC, but you can use the Poly USB bars along with your own BYOD PC running the regular Meets app, or consider using a Poly Studio X which has the native Google Meets app.";
    form.appendChild(platformInfo);

    // Generate button + results
    const btn = document.createElement("button");
    btn.id = "generateBtn";
    btn.type = "button";
    btn.className = "px-4 py-2 bg-blue-600 text-white rounded";
    btn.textContent = "Generate BOM";
    form.appendChild(btn);
// Reliable handler for Generate BOM
btn.addEventListener("click", () => generate(catalog));

    const resultDiv = document.createElement("div");
    resultDiv.id = "result";
    resultDiv.className = "mt-6 space-y-4";

    app.appendChild(form);
    app.appendChild(resultDiv);

    // Dynamic UI hooks
    function updatePlatformInfo() {
      const p = document.getElementById("platform").value;
      const s = document.getElementById("typeOfSystem").value;
      const info = document.getElementById("platformInfo");
      const shouldShow = (s === "Windows PC based solution" && p === "Google Meet");
      info.classList.toggle("hidden", !shouldShow);
    }
    
    function updateCameraVisibility() {
  const t = document.getElementById("typeOfSystem").value;
  const r = document.getElementById("roomSize").value;
  const wrap = document.getElementById("cameraWrap");
  if (wrap) wrap.classList.toggle("hidden", !(t === "Android appliance based solution" && r === "Very large"));
}

function updateExpansionMicOptions() {
      const typeOfSystem = document.getElementById("typeOfSystem").value;
      const roomSize = document.getElementById("roomSize").value;
      const expSel = document.getElementById("expansionMic");
      const info = document.getElementById("expansionInfo");

      // Determine if the base device will be one of V12, V52, X32, X52
      const isUSBorPC = (typeOfSystem === "USB bar only" || typeOfSystem === "Windows PC based solution");
      const restrict =
        (isUSBorPC && (roomSize === "Small" || roomSize === "Medium"))  // V12 or V52
        || (typeOfSystem === "Android appliance based solution" && (roomSize === "Small" || roomSize === "Medium")); // X32 or X52

      const allOpts = [
        "None",
        "Single Analog Exp mic",
        "Existing IP table mics",
        "Existing IP Ceiling mics",
        "New White A2 table mic pod(s) (not shipping yet)",
        "New Black A2 table mic pod(s) (not shipping yet)"
      ];

      const allowed = restrict
        ? ["None", "Single Analog Exp mic", "New White A2 table mic pod(s) (not shipping yet)", "New Black A2 table mic pod(s) (not shipping yet)"]
        : allOpts;

      // Preserve selection if still allowed; otherwise reset to "None"
      const current = expSel.value;
      expSel.innerHTML = '<option value="">--</option>' + allowed.map(o => `<option value="${o}">${o}</option>`).join("");
      if (allowed.includes(current)) {
        expSel.value = current;
      } else {
        expSel.value = "None";
      }

      // Show/hide helper note
      info.classList.toggle("hidden", !restrict);

      // Ensure A2 qty visibility is updated
      const showA2 = expSel.value.includes('A2 table mic pod');
      const wrap = document.getElementById('a2QtyWrapper');
      if (wrap) wrap.classList.toggle('hidden', !showA2);
    }

function updateA2Qty() {
      const v = document.getElementById('expansionMic').value;
      const wrap = document.getElementById('a2QtyWrapper');
      const show = v.includes('A2 table mic pod');
      wrap.classList.toggle('hidden', !show);
    }
    document.getElementById("platform").addEventListener("change", updatePlatformInfo);
    document.getElementById("typeOfSystem").addEventListener("change", () => { updatePlatformInfo(); updateExpansionMicOptions(); updateCameraVisibility(); });
    document.getElementById("roomSize").addEventListener("change", () => { updateExpansionMicOptions(); updateCameraVisibility(); });
    document.getElementById("expansionMic").addEventListener("change", updateA2Qty);
    updatePlatformInfo(); updateA2Qty(); updateExpansionMicOptions(); updateCameraVisibility();

    // ------------- Core BOM Logic -------------
    function generate(catalog) {
      const typeOfSystem = document.getElementById("typeOfSystem").value;
      const platform = document.getElementById("platform").value;
      const roomSize = document.getElementById("roomSize").value;
      const mounting = document.getElementById("mounting").value;
      const expansionMic = document.getElementById("expansionMic").value;
      const schedulingPanel = document.getElementById("schedulingPanel").value;
      const supportTerm = document.getElementById("supportTerm").value;
      const implementationHelp = document.getElementById("implementationHelp").value;
      const accessories = (document.getElementById("accessories").value || "").split(",").map(s => s.trim()).filter(Boolean);
      const includePrices = document.getElementById("includePrices").checked;

      const results = [];
      const isUSBorPC = (typeOfSystem === "USB bar only" || typeOfSystem === "Windows PC based solution");

      // Required fields
      if (!typeOfSystem || !platform || !roomSize) {
        resultDiv.innerHTML = `<div class="text-red-700 bg-red-50 border border-red-200 p-3 rounded">Please select System type, Platform, and Room size.</div>`;
        return;
      }

      // ===== Base devices
      if (typeOfSystem === "USB bar only" || typeOfSystem === "Windows PC based solution") {
        // V-series
        if (roomSize === "Small") {
          addLine(results, "A9DD8AA#ABA"); // V12
          if (supportTerm === "1yr") addLine(results, "UE1X6PV");
          else if (supportTerm === "3yr") addLine(results, "UE1X7PV");
        } else if (roomSize === "Medium") {
          addLine(results, "A09D4AA#ABA"); // V52
          if (supportTerm === "1yr") addLine(results, "U86MNPV");
          else if (supportTerm === "3yr") addLine(results, "U86MQPV");
        } else if (roomSize === "Large" || roomSize === "Very large") {
          addLine(results, "AV1E3AA#ABA"); // V72
          if (supportTerm === "1yr") addLine(results, "U98X0PV");
          else if (supportTerm === "3yr") addLine(results, "U98X1PV");
        }

        // PC overlay by platform
        if (typeOfSystem === "Windows PC based solution") {
          if (platform === "Zoom") {
            addLine(results, "9C422AW#ABA", "HP Mini Conf G9 wZR i7-12700T 16GB Zoom Room PC only (must add TC10, Camera, Audio)");
            if (supportTerm === "1yr") addLine(results, "P88120112");
            else if (supportTerm === "3yr") addLine(results, "P88120312");
            // Temporary: TC10 always for Zoom PC
            addLine(results, "977L6AA#ABA");
            if (supportTerm === "1yr") addLine(results, "P37760112");
            else if (supportTerm === "3yr") addLine(results, "P37760312");
          } else if (platform === "Microsoft Teams") {
            addLine(results, "A3LU8AA#ABA"); // Teams Rooms on Windows PC
            if (supportTerm === "1yr") addLine(results, "U95J8PV");
            else if (supportTerm === "3yr") addLine(results, "U95J9PV");
          } else if (platform === "Google Meet") {
            addLine(results, "9C422AW#ABA"); // BYOD meet PC
            if (supportTerm === "1yr") addLine(results, "P88120112");
            else if (supportTerm === "3yr") addLine(results, "P88120312");
          }
        }
      } else if (typeOfSystem === "Android appliance based solution") {
        // X-series
        if (roomSize === "Small") {
          addLine(results, "A3SV5AA#ABA"); // X32
          if (supportTerm === "1yr") addLine(results, "UE1Q8PV");
          else if (supportTerm === "3yr") addLine(results, "UE1Q9PV");
        } else if (roomSize === "Medium") {
          addLine(results, "8D8L1AA#ABA"); // X52 w/ TC10
          if (supportTerm === "1yr") addLine(results, "P87625112");
          else if (supportTerm === "3yr") addLine(results, "P87625312");
        } else if (roomSize === "Large") {
          addLine(results, "A4MA7AA#ABA"); // X72 w/ TC10
          if (supportTerm === "1yr") addLine(results, "U98SXPV");
          else if (supportTerm === "3yr") addLine(results, "U98SYPV");
        } else if (roomSize === "Very large") {
          addLine(results, "A01KCAA#AC3"); // G62 base
          if (supportTerm === "1yr") addLine(results, "U86WDPV");
          else if (supportTerm === "3yr") addLine(results, "U77D3PV");
        }
      }

      // ===== Guard rail: enforce Android Very large -> G62
      (function(){
        if (typeOfSystem === "Android appliance based solution" && roomSize === "Very large") {
          const removeSkus = ["A4MA7AA#ABA","U98SXPV","U98SYPV"];
          for (let i = results.length - 1; i >= 0; i--) {
            if (removeSkus.includes(results[i].sku)) results.splice(i, 1);
          }
          if (!hasSku(results, "A01KCAA#AC3")) addLine(results, "A01KCAA#AC3");
          if (supportTerm === "1yr" && !hasSku(results, "U86WDPV")) addLine(results, "U86WDPV");
          if (supportTerm === "3yr" && !hasSku(results, "U77D3PV")) addLine(results, "U77D3PV");
        }
      })();

      // ===== Cameras for G62 Very Large
      (function(){
        const camSel = document.getElementById("cameraChoice");
        const choice = camSel ? camSel.value : "None";
        const g62Selected = hasSku(results, "A01KCAA#AC3");
        if (!g62Selected || !choice || choice === "None") return;
        if (choice === "E60") {
          if (!hasSku(results, "9W1A6AA#AC3")) addLine(results, "9W1A6AA#AC3");
          if (supportTerm === "1yr" && !hasSku(results, "U86LCPV")) addLine(results, "U86LCPV");
          if (supportTerm === "3yr" && !hasSku(results, "U86LDPV")) addLine(results, "U86LDPV");
        } else if (choice === "E70") {
          if (!hasSku(results, "842F8AA")) addLine(results, "842F8AA");
          if (supportTerm === "1yr" && !hasSku(results, "P87090112")) addLine(results, "P87090112");
          if (supportTerm === "3yr" && !hasSku(results, "P87090312")) addLine(results, "P87090312");
        }
      })();

      // ===== PoE injector for A2 Bridge (guard)
      (function(){
        if (hasSku(results, "B22X2AA#AC3") && !hasSku(results, "A02F9AA")) addLine(results, "A02F9AA");
      })();

      // ===== X32 extras: PoE injector + TC10 (+ PolyPlus)
      (function(){
        if (!hasSku(results, "A3SV5AA#ABA")) return;
        if (!hasSku(results, "B5NH6AA")) addLine(results, "B5NH6AA");
        if (!hasSku(results, "977L6AA#ABA")) addLine(results, "977L6AA#ABA");
        if (supportTerm === "1yr" && !hasSku(results, "P37760112")) addLine(results, "P37760112");
        if (supportTerm === "3yr" && !hasSku(results, "P37760312")) addLine(results, "P37760312");
      })();

      // ===== V12 extras: PoE injector (same as X32)
      (function(){
        if (!hasSku(results, "A9DD8AA#ABA")) return;
        if (!hasSku(results, "B5NH6AA")) addLine(results, "B5NH6AA");
      })();

      // ===== Guard: TC10 (+ PolyPlus) for G62
      (function(){
        if (!hasSku(results, "A01KCAA#AC3")) return;
        if (!hasSku(results, "977L6AA#ABA")) {
          addLine(results, "977L6AA#ABA");
          if (supportTerm === "1yr") addLine(results, "P37760112");
          else if (supportTerm === "3yr") addLine(results, "P37760312");
        }
      })();

      // ===== Mounting
      if (mounting === "Wall") addLine(results, "HPWALLMOUNT", "Wall mounting kit");
      else if (mounting === "VESA style display mount") addLine(results, "HPVESAMOUNT", "VESA style display mount");
      else if (mounting === "Table") addLine(results, "HPTABLEMOUNT", "Table mounting kit");

      // ===== Scheduling panel
      if (schedulingPanel === "Yes") {
        addLine(results, "977L6AA#ABA", "Poly TC10 touch controller (as scheduling panel)");
        if (supportTerm === "1yr") addLine(results, "P37760112");
        else if (supportTerm === "3yr") addLine(results, "P37760312");
      }

      // ===== Expansion mic
      // Medium analog guard
      if (roomSize === "Medium" && expansionMic === "Single Analog Exp mic" && !hasSku(results, "875M6AA")) {
        addLine(results, "875M6AA");
      }

      // A2 mic logic (all system types/platforms)
      const wantsA2White = expansionMic === "New White A2 table mic pod(s) (not shipping yet)";
      const wantsA2Black = expansionMic === "New Black A2 table mic pod(s) (not shipping yet)";
      if (wantsA2White || wantsA2Black) {
        let a2Qty = parseInt((document.getElementById("a2Qty")?.value || "1"), 10);
        if (isNaN(a2Qty) || a2Qty < 1) a2Qty = 1;
        if (a2Qty > 8) a2Qty = 8;
        const v12InBOM = (isUSBorPC && roomSize === "Small" && hasSku(results, "A9DD8AA#ABA"));
        if (v12InBOM) a2Qty = 1;

        const podSku = wantsA2White ? "B22X4AA#AC3" : "B22X6AA#AC3";
        addLine(results, podSku, "(A2 mic pod)", a2Qty);

        if (!v12InBOM) {
          addLine(results, "B22X2AA#AC3"); // A2 bridge
          if (supportTerm === "1yr") addLine(results, "UJ9C3PV");
          else if (supportTerm === "3yr") addLine(results, "UJ9C4PV");
        }

        // X32/X52/V52 require dongle when using A2 (once)
        if ((hasSku(results, "A3SV5AA#ABA") || hasSku(results, "8D8L1AA#ABA") || hasSku(results, "A09D4AA#ABA")) && !hasSku(results, "4Z7Z7AA")) {
          addLine(results, "4Z7Z7AA");
        }
      }

      // Legacy IP mic choices
      if (expansionMic === "Existing IP table mics") {
        addLine(results, "874R3AA");
        addLine(results, "GSM4210PD M4250-9G1F-PoE+", "3rd party Netgear AV PoE switch with PTP (needed with multiple Poly IP mic arrays)");
      } else if (expansionMic === "Existing IP Ceiling mics") {
        addLine(results, "875S1AA");
        addLine(results, "GSM4210PD M4250-9G1F-PoE+", "3rd party Netgear AV PoE switch with PTP (needed with multiple Poly IP mic arrays)");
      }

      // Accessories
      accessories.forEach(acc => addLine(results, acc, "(Custom accessory)"));

      // ===== Implementation help
      if (implementationHelp && implementationHelp !== "None") {
        let remoteSku = "";
        if (typeOfSystem === "Windows PC based solution") {
          remoteSku = "PROECOSYS02";
        } else if (hasSku(results, "A3SV5AA#ABA") || hasSku(results, "8D8L1AA#ABA") || hasSku(results, "A09D4AA#ABA")) {
          remoteSku = "PROSTDIOXR2";
        } else if (hasSku(results, "G62") || hasSku(results, "G7500")) {
          remoteSku = "PROG7500RE2";
        }
        if (implementationHelp === "Remote Implementation help" && remoteSku) {
          addLine(results, remoteSku);
        } else if (implementationHelp === "Onsite Implementation help") {
          if (remoteSku) addLine(results, remoteSku);
          addLine(results, "PROSMTHND04");
        }
      }

      // ===== BOM NOTE row for Windows PC + Google Meet
      const noteRow = (typeOfSystem === "Windows PC based solution" && platform === "Google Meet")
        ? `<tr class='bg-amber-50 text-amber-900'>
            <td class='border px-4 py-2 align-top italic'>NOTE</td>
            <td class='border px-4 py-2 align-top' colspan='2'>HP Poly does not currently offer a Google Meets imaged PC, but you can use the Poly USB bars along with your own BYOD PC running the regular Meets app, or consider using a Poly Studio X which has the native Google Meets app.</td>
            ${includePrices ? `<td class='border px-4 py-2 align-top'>—</td>` : ``}
           </tr>`
        : "";

      // ===== Render
      let html = `
<p class='text-sm italic text-gray-600 mb-2'>Disclaimer: Generated with AI, subject to errors. Not an official HP tool.</p>
<table class='w-full border-collapse text-sm'>
<thead>
  <tr>
    <th class='border px-4 py-2 text-left'>Qty</th>
    <th class='border px-4 py-2 text-left'>SKU</th>
    <th class='border px-4 py-2 text-left'>Description</th>
    ${includePrices ? "<th class='border px-4 py-2 text-left'>MSRP</th>" : ""}
  </tr>
</thead>
<tbody>
${noteRow}
`;
      results.forEach(r => {
        html += `<tr>
  <td class='border px-4 py-2 align-top'>${r.quantity || 1}</td>
  <td class='border px-4 py-2 align-top'>${r.sku}</td>
  <td class='border px-4 py-2 align-top'>${r.description}</td>
  ${includePrices ? `<td class='border px-4 py-2 align-top'>${fmt(r.msrp)}</td>` : ""}
</tr>`;
      });
      
      html += "</tbody></table>";

      // Mic Options Reference (shown when any expansion mic option is selected)
      if (expansionMic && expansionMic !== "None") {
        // Helper to pull description from catalog
        const desc = sku => (catalog[sku]?.description) || "";
        const line = (sku, note="") => {
          const d = desc(sku);
          const extra = note ? ` <em>(${note})</em>` : "";
          return `<li><code>${sku}</code> — ${d || "(description not found)"}${extra}</li>`;
        };

        // Build reference list dynamically from catalog
        let refHtml = "<ul>";
        refHtml += line("875M6AA", "Single Analog Expansion mic");
        refHtml += line("874R3AA", "Existing IP table mics");
        refHtml += line("875S1AA", "Existing IP ceiling mics");
        refHtml += line("B22X4AA#AC3", "New A2 white table mic pod");
        refHtml += line("B22X6AA#AC3", "New A2 black table mic pod");
        refHtml += line("B22X2AA#AC3", "A2 Bridge (required unless V12 Small)");
        // Third-party PoE switch (may not exist in catalog)
        refHtml += `<li><code>GSM4210PD M4250-9G1F-PoE+</code> — 3rd party Netgear AV PoE switch with PTP (needed with multiple Poly IP mic arrays)</li>`;
        refHtml += "</ul>";

        html += `
<details class='mt-3'>
  <summary class='cursor-pointer text-blue-600 hover:underline'>Show Mic Options</summary>
  <div class='mt-2 text-sm'>${refHtml}</div>
</details>`;
      }

      
      // Always prepend disclaimer + links + title before rendering
      (function(){
        const meta = [
          "<p class='text-sm italic text-gray-600 mb-2'>Disclaimer: Generated with AI, subject to errors. Not an official HP tool.</p>",
          "<p class='text-sm mb-4'><a href=\"https://docs.google.com/presentation/d/1gIB--U2tGHcWaI1DXk4ovZVH9pme3rUD/edit?usp=sharing&ouid=104449332556651601678&rtpof=true&sd=true\" target=\"_blank\" class=\"text-blue-600 underline\">For additional Quoting Guide information</a></p>",
          "<p class='text-sm mb-4'>See additional solution wiring diagrams and solution selector with <a href=\"https://www.hp.com/us-en/poly/spaces.html\" target=\"_blank\" class=\"text-blue-600 underline\">Poly Spaces</a>.</p>",
          "<h2 class='font-semibold mb-2'>Your BOM:</h2>"
        ].join("");
        if (!html.includes("Poly Spaces") || !html.includes("Quoting Guide information")) {
          html = meta + html;
        }
      })();
resultDiv.innerHTML = html;


      resultDiv.innerHTML = html;
    }

  } catch (e) {
    const app = document.getElementById('app');
    if (app) app.innerHTML = `<div class='text-red-700 bg-red-50 border border-red-200 p-3 rounded'>Failed to load configurator: ${e?.message || e}. Check that <code>skus_merged.json</code> is reachable and valid.</div>`;
    console.error('Configurator init failed:', e);
  }
}

window.onload = init;


// Update H1 with current version
(function(){
  const h1 = document.querySelector("h1");
  if (h1 && !h1.textContent.includes("v9.61")) {
    h1.textContent += " (v9.61)";
  }
})();
