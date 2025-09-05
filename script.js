// script.js – HP | Poly Configurator – v9.62

document.title = 'Poly Video Conferencing "Bill" of Materials Generator v9.62';

async function init() {
  const res = await fetch('skus_merged.json');
  if (!res.ok) throw new Error(`Failed to load skus_merged.json (${res.status})`);
  const catalog = await res.json();

  // ---------- helpers ----------
  const getItem = sku => catalog[sku] || null;
  const hasSku = (arr, sku) => arr.some(x => x.sku === sku);
  const addLine = (arr, sku, fallback="(Custom item)", qty=1) => {
    const item = getItem(sku);
    const existing = arr.find(x => x.sku === sku);
    if (existing) { existing.quantity += qty; return; }
    arr.push({
      sku,
      description: item?.description || fallback,
      msrp: item?.msrp ?? "",
      quantity: qty
    });
  };
  const fmtCurrency = v => {
    if (v === "" || v === null || v === undefined) return "—";
    if (typeof v !== "number") return String(v);
    return `$${v.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
  };

  // ---------- UI ----------
  const app = document.getElementById("app");
  app.innerHTML = "";

  const select = (id, label, options) => {
    const wrap = document.createElement("div");
    const opts = options.map(o => typeof o === "string" ? {value: o, label: o} : o);
    wrap.innerHTML = `
      <label class="block font-medium">${label}</label>
      <select id="${id}" class="border p-2 w-full">
        <option value="">--</option>
        ${opts.map(o => `<option value="${o.value}">${o.label ?? o.value}</option>`).join("")}
      </select>`;
    return wrap;
  };
  const input = (id, label, ph="") => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<label class="block font-medium">${label}</label>
      <input id="${id}" class="border p-2 w-full" placeholder="${ph}">`;
    return wrap;
  };

  const form = document.createElement("form");
  form.className = "space-y-4";

  form.appendChild(select("typeOfSystem","Select System Type",[
    "USB bar only",
    "Windows PC based solution",
    "Android appliance based solution"
  ]));
  form.appendChild(select("platform","Select Primary Platform",["Zoom","Microsoft Teams","Google Meet"]));
  form.appendChild(select("roomSize","Select Room Size",[
    "Small","Medium","Large",
    {value:"Very large", label:"Very Large room. Distance of > 25' from front of room to furthest person to cover"}
  ]));
  form.appendChild(select("mounting","Select Mounting option",["None","Wall","VESA style display mount","Table"]));

  // Expansion mics
  const exp = select("expansionMic","Include Expansion Mic?",[
    "None",
    "Single Analog Exp mic",
    "Existing IP table mics",
    "Existing IP Ceiling mics",
    "New White A2 table mic pod(s) (not shipping yet)",
    "New Black A2 table mic pod(s) (not shipping yet)"
  ]);
  form.appendChild(exp);

  const expansionInfo = document.createElement("div");
  expansionInfo.id="expansionInfo";
  expansionInfo.className="hidden text-sm mt-1 p-2 border-l-4 border-amber-400 bg-amber-50 text-amber-900 rounded";
  expansionInfo.textContent = "Note: IP table/ceiling mics are not supported with V12, X32, X52, or V52. Use Analog or A2 mics.";
  form.appendChild(expansionInfo);

  const a2QtyWrap = document.createElement("div");
  a2QtyWrap.id = "a2QtyWrapper";
  a2QtyWrap.className = "hidden";
  a2QtyWrap.innerHTML = `<label class="block font-medium">Number of A2 mic pods (1–8)</label>
    <input id="a2Qty" type="number" min="1" max="8" value="1" class="border p-2 w-full">`;
  form.appendChild(a2QtyWrap);

  // Camera picker (G62)
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

  form.appendChild(select("schedulingPanel","Include additional TC10 to use as scheduling panel outside room?",["None","Yes"]));
  form.appendChild(select("supportTerm","Select Support term",["None","1yr","3yr"]));
  form.appendChild(select("implementationHelp","Implementation Help",["None","Remote Implementation help","Onsite Implementation help"]));
  form.appendChild(input("accessories","Optional: any additional accessories (comma-separated SKUs)","e.g. cables, plates"));

  const priceWrap = document.createElement("label");
  priceWrap.className = "inline-flex items-center gap-2";
  priceWrap.innerHTML = `<input id="includePrices" type="checkbox" class="border"> Include Prices (MSRP)`;
  form.appendChild(priceWrap);

  const platformInfo = document.createElement("div");
  platformInfo.id="platformInfo";
  platformInfo.className="hidden text-sm mt-1 p-2 border-l-4 border-amber-400 bg-amber-50 text-amber-900 rounded";
  platformInfo.textContent = "HP Poly does not currently offer a Google Meets imaged PC, but you can use the Poly USB bars along with your own BYOD PC running the regular Meets app, or consider using a Poly Studio X which has the native Google Meets app.";
  form.appendChild(platformInfo);

  const btn = document.createElement("button");
  btn.type="button";
  btn.id="generateBtn";
  btn.className="px-4 py-2 bg-blue-600 text-white rounded";
  btn.textContent="Generate BOM";
  form.appendChild(btn);

  const resultDiv = document.createElement("div");
  resultDiv.id="result";
  resultDiv.className="mt-6 space-y-4";

  app.appendChild(form);
  app.appendChild(resultDiv);

  // dynamic UI
  function updatePlatformInfo(){
    const p = document.getElementById("platform").value;
    const s = document.getElementById("typeOfSystem").value;
    platformInfo.classList.toggle("hidden", !(s==="Windows PC based solution" && p==="Google Meet"));
  }
  function updateCameraVisibility(){
    const t = document.getElementById("typeOfSystem").value;
    const r = document.getElementById("roomSize").value;
    camWrap.classList.toggle("hidden", !(t==="Android appliance based solution" && r==="Very large"));
  }
  function updateExpansionMicUI(){
    const t = document.getElementById("typeOfSystem").value;
    const r = document.getElementById("roomSize").value;
    const expSel = document.getElementById("expansionMic");
    const restrict =
      ((t==="USB bar only" || t==="Windows PC based solution") && (r==="Small" || r==="Medium")) ||
      (t==="Android appliance based solution" && (r==="Small" || r==="Medium"));
    const all = [
      "None",
      "Single Analog Exp mic",
      "Existing IP table mics",
      "Existing IP Ceiling mics",
      "New White A2 table mic pod(s) (not shipping yet)",
      "New Black A2 table mic pod(s) (not shipping yet)"
    ];
    const allowed = restrict
      ? ["None","Single Analog Exp mic","New White A2 table mic pod(s) (not shipping yet)","New Black A2 table mic pod(s) (not shipping yet)"]
      : all;
    const current = expSel.value;
    expSel.innerHTML = `<option value="">--</option>${allowed.map(o=>`<option value="${o}">${o}</option>`).join("")}`;
    expSel.value = allowed.includes(current) ? current : "None";
    expansionInfo.classList.toggle("hidden", !restrict);

    const showA2 = expSel.value.includes("A2 table mic pod");
    a2QtyWrap.classList.toggle("hidden", !showA2);
  }

  document.getElementById("platform").addEventListener("change", updatePlatformInfo);
  document.getElementById("typeOfSystem").addEventListener("change", ()=>{updatePlatformInfo();updateCameraVisibility();updateExpansionMicUI();});
  document.getElementById("roomSize").addEventListener("change", ()=>{updateCameraVisibility();updateExpansionMicUI();});
  document.getElementById("expansionMic").addEventListener("change", updateExpansionMicUI);
  updatePlatformInfo(); updateCameraVisibility(); updateExpansionMicUI();

  // ---------- core generate ----------
  btn.addEventListener("click", () => generate());

  function generate(){
    const typeOfSystem = document.getElementById("typeOfSystem").value;
    const platform     = document.getElementById("platform").value;
    const roomSize     = document.getElementById("roomSize").value;
    const mounting     = document.getElementById("mounting").value;
    const expansionMic = document.getElementById("expansionMic").value;
    const scheduling   = document.getElementById("schedulingPanel").value;
    const supportTerm  = document.getElementById("supportTerm").value;
    const implHelp     = document.getElementById("implementationHelp").value;
    const accessories  = (document.getElementById("accessories").value || "").split(",").map(s=>s.trim()).filter(Boolean);
    const includePrices= document.getElementById("includePrices").checked;

    if (!typeOfSystem || !platform || !roomSize){
      resultDiv.innerHTML = `<div class="text-red-700 bg-red-50 border border-red-200 p-3 rounded">Please select System type, Platform, and Room size.</div>`;
      return;
    }

    const results = [];
    const isUSBorPC = (typeOfSystem==="USB bar only" || typeOfSystem==="Windows PC based solution");

    // ---- base devices
    if (isUSBorPC){
      if (roomSize==="Small"){
        addLine(results,"A9DD8AA#ABA"); // V12
        if (supportTerm==="1yr") addLine(results,"UE1X6PV");
        else if (supportTerm==="3yr") addLine(results,"UE1X7PV");
      } else if (roomSize==="Medium"){
        addLine(results,"A09D4AA#ABA"); // V52
        if (supportTerm==="1yr") addLine(results,"U86MNPV");
        else if (supportTerm==="3yr") addLine(results,"U86MQPV");
      } else { // Large or Very large -> V72
        addLine(results,"AV1E3AA#ABA");
        if (supportTerm==="1yr") addLine(results,"U98X0PV");
        else if (supportTerm==="3yr") addLine(results,"U98X1PV");
      }

      if (typeOfSystem==="Windows PC based solution"){
        if (platform==="Zoom"){
          addLine(results,"9C422AW#ABA","HP Mini Conf G9 wZR i7-12700T 16GB Zoom Room PC only (must add TC10, Camera, Audio)");
          if (supportTerm==="1yr") addLine(results,"P88120112");
          else if (supportTerm==="3yr") addLine(results,"P88120312");
          // Zoom PC requires TC10
          addLine(results,"875K5AA"); // TC10
          if (supportTerm==="1yr") addLine(results,"P37760112");
          else if (supportTerm==="3yr") addLine(results,"P37760312");
        } else if (platform==="Microsoft Teams"){
          addLine(results,"A3LU8AA#ABA");
          if (supportTerm==="1yr") addLine(results,"U95J8PV");
          else if (supportTerm==="3yr") addLine(results,"U95J9PV");
        } else if (platform==="Google Meet"){
          addLine(results,"9C422AW#ABA");
          if (supportTerm==="1yr") addLine(results,"P88120112");
          else if (supportTerm==="3yr") addLine(results,"P88120312");
        }
      }
    } else {
      // Android
      if (roomSize==="Small"){
        addLine(results,"A3SV5AA#ABA"); // X32
        if (supportTerm==="1yr") addLine(results,"UE1Q8PV");
        else if (supportTerm==="3yr") addLine(results,"UE1Q9PV");
      } else if (roomSize==="Medium"){
        addLine(results,"8D8L1AA#ABA"); // X52 w TC10
        if (supportTerm==="1yr") addLine(results,"P87625112");
        else if (supportTerm==="3yr") addLine(results,"P87625312");
      } else if (roomSize==="Large"){
        addLine(results,"A4MA7AA#ABA"); // X72 w TC10
        if (supportTerm==="1yr") addLine(results,"U98SXPV");
        else if (supportTerm==="3yr") addLine(results,"U98SYPV");
      } else {
        // Very large -> force G62
        addLine(results,"A01KCAA#AC3"); // G62
        if (supportTerm==="1yr") addLine(results,"U86WDPV");
        else if (supportTerm==="3yr") addLine(results,"U77D3PV");
      }
    }

    // Guard: Android Very Large must be G62 (remove X72 if present)
    if (typeOfSystem==="Android appliance based solution" && roomSize==="Very large"){
      for (let i=results.length-1;i>=0;i--){
        if (["A4MA7AA#ABA","U98SXPV","U98SYPV"].includes(results[i].sku)) results.splice(i,1);
      }
      if (!hasSku(results,"A01KCAA#AC3")) addLine(results,"A01KCAA#AC3");
    }

    // G62 camera add-ons
    (function(){
      const isG62 = hasSku(results,"A01KCAA#AC3");
      if (!isG62) return;
      const cam = document.getElementById("cameraChoice").value;
      if (cam==="E60"){
        if (!hasSku(results,"9W1A6AA#AC3")) addLine(results,"9W1A6AA#AC3");
        if (supportTerm==="1yr") addLine(results,"U86LCPV");
        else if (supportTerm==="3yr") addLine(results,"U86LDPV");
      } else if (cam==="E70"){
        if (!hasSku(results,"842F8AA")) addLine(results,"842F8AA");
        if (supportTerm==="1yr") addLine(results,"P87090112");
        else if (supportTerm==="3yr") addLine(results,"P87090312");
      }
      // G62 requires TC10
      if (!hasSku(results,"875K5AA")){
        addLine(results,"875K5AA");
        if (supportTerm==="1yr") addLine(results,"P37760112");
        else if (supportTerm==="3yr") addLine(results,"P37760312");
      }
    })();

    // X32 extras: PoE + TC10 (+ PolyPlus)
    if (hasSku(results,"A3SV5AA#ABA")){
      if (!hasSku(results,"B5NH6AA")) addLine(results,"B5NH6AA");
      if (!hasSku(results,"875K5AA")) addLine(results,"875K5AA");
      if (supportTerm==="1yr") addLine(results,"P37760112");
      else if (supportTerm==="3yr") addLine(results,"P37760312");
    }

    // V12 needs same PoE injector as X32
    if (hasSku(results,"A9DD8AA#ABA") && !hasSku(results,"B5NH6AA")) addLine(results,"B5NH6AA");

    // Scheduling panel = TC10
    if (scheduling==="Yes"){
      addLine(results,"875K5AA","Poly TC10 touch controller (as scheduling panel)");
      if (supportTerm==="1yr") addLine(results,"P37760112");
      else if (supportTerm==="3yr") addLine(results,"P37760312");
    }

    // Expansion mic logic
    if (roomSize==="Medium" && expansionMic==="Single Analog Exp mic" && !hasSku(results,"875M6AA")) {
      addLine(results,"875M6AA");
    }
    const wantsA2White = expansionMic.includes("New White A2");
    const wantsA2Black = expansionMic.includes("New Black A2");
    if (wantsA2White || wantsA2Black){
      let qty = parseInt(document.getElementById("a2Qty").value || "1",10);
      if (isNaN(qty) || qty<1) qty=1;
      if (qty>8) qty=8;
      const v12InBOM = hasSku(results,"A9DD8AA#ABA");
      if (v12InBOM) qty = 1;
      const podSku = wantsA2White ? "B22X4AA#AC3" : "B22X6AA#AC3";
      addLine(results,podSku,"(A2 mic pod)",qty);
      if (!v12InBOM){
        addLine(results,"B22X2AA#AC3");
        if (supportTerm==="1yr") addLine(results,"UJ9C3PV");
        else if (supportTerm==="3yr") addLine(results,"UJ9C4PV");
      }
      // Add required PoE for A2 bridge
      if (hasSku(results,"B22X2AA#AC3") && !hasSku(results,"A02F9AA")) addLine(results,"A02F9AA");
      // X32/X52/V52 require dongle
      if ((hasSku(results,"A3SV5AA#ABA") || hasSku(results,"8D8L1AA#ABA") || hasSku(results,"A09D4AA#ABA")) && !hasSku(results,"4Z7Z7AA")){
        addLine(results,"4Z7Z7AA");
      }
    }
    if (expansionMic==="Existing IP table mics"){
      addLine(results,"874R3AA");
      addLine(results,"GSM4210PD M4250-9G1F-PoE+","3rd party Netgear AV PoE switch with PTP (needed with multiple Poly IP mic arrays)");
    } else if (expansionMic==="Existing IP Ceiling mics"){
      addLine(results,"875S1AA");
      addLine(results,"GSM4210PD M4250-9G1F-PoE+","3rd party Netgear AV PoE switch with PTP (needed with multiple Poly IP mic arrays)");
    }

    // Accessories passthrough
    accessories.forEach(sku => addLine(results, sku, "(Custom accessory)"));

    // Implementation help
    if (implHelp && implHelp!=="None"){
      let remoteSku = "";
      if (typeOfSystem==="Windows PC based solution") remoteSku = "PROECOSYS02";
      else if (hasSku(results,"A01KCAA#AC3")) remoteSku = "PROG7500RE2";
      else if (hasSku(results,"A3SV5AA#ABA") || hasSku(results,"8D8L1AA#ABA")) remoteSku = "PROSTDIOXR2";
      if (implHelp==="Remote Implementation help" && remoteSku) addLine(results, remoteSku);
      if (implHelp==="Onsite Implementation help"){
        if (remoteSku) addLine(results, remoteSku);
        addLine(results,"PROSMTHND04");
      }
    }

    // Mounting logic (real SKUs)
    (function addMounting(){
      if (mounting==="None") return;

      const isV12 = hasSku(results,"A9DD8AA#ABA");
      const isV52 = hasSku(results,"A09D4AA#ABA");
      const isV72 = hasSku(results,"AV1E3AA#ABA");
      const isX32 = hasSku(results,"A3SV5AA#ABA");
      const isX52 = hasSku(results,"8D8L1AA#ABA");
      const isX72 = hasSku(results,"A4MA7AA#ABA");

      // V12 / X32
      if (isV12 || isX32){
        if (mounting==="Table") addLine(results,"875L5AA");
        else /* Wall or VESA */ addLine(results,"875L6AA");
        return;
      }
      // X50/X52/V52
      if (isX52 || isV52){
        if (mounting==="Wall") addLine(results,"875L8AA");
        else if (mounting==="VESA style display mount") addLine(results,"875L9AA");
        else if (mounting==="Table") addLine(results,"875M0AA");
        return;
      }
      // X70/X72/V72
      if (isX72 || isV72){
        if (mounting==="VESA style display mount") addLine(results,"875L2AA");
        else if (mounting==="Table") addLine(results,"875L3AA");
        else if (mounting==="Wall"){
          // Insert a NOTE row (no SKU)
          addLine(results, "NOTE-WALL-X70X72V72", "Wall mounting not supported for X70/X72/V72 — choose VESA or Table.", 1);
        }
      }
    })();

    // Note row for Windows PC + Google Meet
    const noteRow = (typeOfSystem==="Windows PC based solution" && platform==="Google Meet")
      ? `<tr class='bg-amber-50 text-amber-900'>
           <td class='border px-4 py-2 align-top italic'>NOTE</td>
           <td class='border px-4 py-2 align-top' colspan='2'>HP Poly does not currently offer a Google Meets imaged PC, but you can use the Poly USB bars along with your own BYOD PC running the regular Meets app, or consider using a Poly Studio X which has the native Google Meets app.</td>
           ${includePrices ? `<td class='border px-4 py-2 align-top'>—</td>` : ``}
         </tr>`
      : "";

    // Render table
    let html = `
<p class="text-sm italic text-gray-600 mb-2">Disclaimer: Generated with AI, subject to errors. Not an official HP tool.</p>
<p class="text-sm mb-4"><a class="text-blue-600 underline" target="_blank" href="https://drive.google.com/file/d/1F3781t_EBTEdLournarER9XfmkGG9CRi/view?usp=sharing">For additional Quoting Guide information</a></p>
<p class="text-sm mb-4">See additional solution wiring diagrams and solution selector with <a class="text-blue-600 underline" target="_blank" href="https://www.hp.com/us-en/poly/spaces.html">Poly Spaces</a>.</p>
<h2 class="font-semibold mb-2">Your BOM:</h2>
<table class="w-full border-collapse text-sm">
  <thead>
    <tr>
      <th class="border px-4 py-2 text-left">Qty</th>
      <th class="border px-4 py-2 text-left">SKU</th>
      <th class="border px-4 py-2 text-left">Description</th>
      ${includePrices?`<th class="border px-4 py-2 text-left">MSRP</th>`:""}
    </tr>
  </thead>
  <tbody>
    ${noteRow}
`;

    results.forEach(r=>{
      // hide the synthetic NOTE row SKU
      const sku = r.sku.startsWith("NOTE-") ? "—" : r.sku;
      html += `<tr>
        <td class="border px-4 py-2 align-top">${r.quantity}</td>
        <td class="border px-4 py-2 align-top">${sku}</td>
        <td class="border px-4 py-2 align-top">${r.description}</td>
        ${includePrices?`<td class="border px-4 py-2 align-top">${fmtCurrency(r.msrp)}</td>`:""}
      </tr>`;
    });

    html += `</tbody></table>`;

    // Conversational Show Mic Options (per your detailed logic)
    function micList(items){
      return `<ul class="list-disc ml-6">${items.map(i=>`<li><code>${i.sku}</code> — ${getItem(i.sku)?.description || i.desc || ""}</li>`).join("")}</ul>`;
    }
    function micOptionsBlock(){
      if (!expansionMic || expansionMic==="None") return "";
      const t = typeOfSystem, r = roomSize;
      const a2Set = [
        {sku:"B22X4AA#AC3", desc:"New A2 white table mic pod"},
        {sku:"B22X6AA#AC3", desc:"New A2 black table mic pod"},
        {sku:"B22X2AA#AC3", desc:"A2 Bridge (required unless V12 Small)"},
        {sku:"A02F9AA", desc:"PoE power injector for G62 or A2 Audio bridge"},
      ];
      const ipSet = [
        {sku:"874R3AA", desc:"Existing IP table mics"},
        {sku:"875S1AA", desc:"Existing IP ceiling mics"},
      ];
      const triSet = [
        {sku:"849B6AA#ABA", desc:"Poly Trio C60 Preconfigured for Teams"},
        {sku:"85X02AA", desc:"Trio C60 expansion mic kit (includes 2 mics)"},
      ];
      const analog = [{sku:"875M6AA", desc:"Single Analog Expansion mic"}];
      const a2Dongle = [{sku:"4Z7Z7AA", desc:"HP USB to Ethernet dongle when using Poly A2 mics+Bridge with X32/X52"}];

      // Helper blocks
      const or = `<p class="my-2 italic">OR</p>`;

      let out = `<details class="mt-3"><summary class="cursor-pointer text-blue-600 hover:underline">Show Mic Options</summary><div class="mt-2 text-sm">`;

      function addSection(items){ out += micList(items); }

      // Android
      if (t==="Android appliance based solution"){
        if (r==="Small"){ // X32
          addSection(a2Set.concat(a2Dongle));
          out += or;
          out += `<p>Pair Trio(s) over the network</p>`;
          addSection(triSet);
        } else if (r==="Medium"){ // X52
          addSection(analog);
          out += or;
          addSection(a2Set.concat(a2Dongle));
          out += or;
          out += `<p>Pair Trio(s) over the network</p>`;
          addSection(triSet);
        } else if (r==="Large"){ // X72
          addSection(analog);
          out += or;
          addSection(ipSet);
          out += or;
          addSection(a2Set.concat(a2Dongle));
          out += or;
          out += `<p>Pair Trio(s) over the network</p>`;
          addSection(triSet);
        } else { // Very large -> G62
          addSection(ipSet);
          out += or;
          addSection(a2Set.concat(a2Dongle));
          out += or;
          out += `<p>Pair Trio(s) over the network</p>`;
          addSection(triSet);
        }
      } else {
        // USB or Windows PC (V series)
        if (r==="Small"){ // V12
          addSection([{sku:"B22X4AA#AC3"},{sku:"B22X6AA#AC3"}]);
        } else if (r==="Medium"){ // V52
          addSection(analog);
          out += or;
          addSection(a2Set.concat(a2Dongle));
        } else if (r==="Large"){ // V72
          addSection(analog);
          out += or;
          addSection(ipSet.concat(a2Set).concat(a2Dongle));
        } else { // Very large (V72 path)
          addSection(ipSet);
          out += or;
          addSection(a2Set.concat(a2Dongle));
        }
      }

      out += `</div></details>`;
      return out;
    }

    html += micOptionsBlock();
    resultDiv.innerHTML = html;
  }
}

window.onload = init;

// Update H1 with current version
(function(){
  const h1 = document.querySelector("h1");
  if (h1 && !h1.textContent.includes("v9.62")) h1.textContent += " (v9.62)";
})();
