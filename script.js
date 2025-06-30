// script.js v9.5 with SKU + description output for all BOM items

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
    form.innerHTML += select("roomSize", "Room Size", ["Small","Medium","Large"]);
    form.innerHTML += select("mounting", "Select add-on Mounting option", ["None","Wall","Ceiling","Table"]);
    form.innerHTML += select("expansionMic", "Include Expansion Mic?", ["None","Yes"]);
    form.innerHTML += select("schedulingPanel", "Include additional TC10 to use as scheduling panel outside room?", ["None","Yes"]);
    form.innerHTML += select("supportTerm", "Select Support Term", ["None","1yr","3yr"]);
    form.innerHTML += `<div><label class="block font-medium">Accessories (comma-separated)</label>
      <input id="accessories" class="border p-2 w-full" placeholder="e.g. Camera, Remote"/></div>`;

    form.innerHTML += `<button type="button" id="generateBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Generate BOM</button>
      <div id="result" class="mt-6"></div>`;

    app.innerHTML = "";
    app.appendChild(form);

    document.getElementById("generateBtn").addEventListener("click", () => generate(skuDescriptions));

  } catch(e) {
    document.getElementById("app").innerHTML = "<p class='text-red-600'>Failed to load skus.json.</p>";
    console.error(e);
  }
}

function generate(skuDescriptions) {
  const results = [];
  const typeOfSystem = document.getElementById("typeOfSystem").value;
  const roomSize = document.getElementById("roomSize").value;
  const expansionMic = document.getElementById("expansionMic").value;
  const mounting = document.getElementById("mounting").value;
  const schedulingPanel = document.getElementById("schedulingPanel").value;
  const supportTerm = document.getElementById("supportTerm").value;
  const accessories = document.getElementById("accessories").value.split(",").map(x=>x.trim()).filter(x=>x);

  // System SKU mapping
  const systemMap = {
    "USB bar only": {"Small":"A9DD8AA#ABA","Medium":"A09D4AA#ABA","Large":"AV1E3AA#ABA"},
    "Windows PC based solution": {"Small":"999V12N","Medium":"A09D4AA#ABA","Large":"AV1E3AA#ABA"},
    "Android appliance based room system": {"Small":"A3SV5AA#ABA","Medium":"8D8L1AA#ABA","Large":"A4MA7AA#ABA"}
  };
  const sysSku = systemMap[typeOfSystem]?.[roomSize];
  if (sysSku && skuDescriptions[sysSku]) {
    results.push({ sku: sysSku, description: skuDescriptions[sysSku] });
  }

  // PolyPlus support SKU mapping
  const supportMap = {
    "999V12N": {"1yr":"UE1X6PV","3yr":"UE1X7PV"},
    "A09D4AA#ABA": {"1yr":"U86MNPV","3yr":"U86MQPV"},
    "AV1E3AA#ABA": {"1yr":"U98X0PV","3yr":"U98X1PV"},
    "A3SV5AA#ABA": {"1yr":"UE1Q8PV","3yr":"UE1Q9PV"},
    "8D8L1AA#ABA": {"1yr":"P87625112","3yr":"P87625312"},
    "A4MA7AA#ABA": {"1yr":"U98SXPV","3yr":"U98X1PV"},
    "A3LU8AA#ABA": {"1yr":"U95J8PV","3yr":"U95J9PV"}
  };
  const supSku = supportMap[sysSku]?.[supportTerm];
  if (supSku && skuDescriptions[supSku]) {
    results.push({ sku: supSku, description: skuDescriptions[supSku] });
  }

  // MTR Base Kit for Windows PC based
  if (typeOfSystem === "Windows PC based solution") {
    if (skuDescriptions["A3LU8AA#ABA"]) {
      results.push({ sku: "A3LU8AA#ABA", description: skuDescriptions["A3LU8AA#ABA"] });
    }
    const mtrSupport = supportTerm === "3yr" ? "U95J9PV" : "U95J8PV";
    if (skuDescriptions[mtrSupport]) {
      results.push({ sku: mtrSupport, description: skuDescriptions[mtrSupport] });
    }
  }

  // Mounting
  if (mounting !== "None" && skuDescriptions[mounting]) {
    results.push({ sku: mounting, description: skuDescriptions[mounting] });
  }

  // Scheduling panel + support
  if (schedulingPanel === "Yes") {
    if (skuDescriptions["977L6AA#ABA"]) {
      results.push({ sku: "977L6AA#ABA", description: skuDescriptions["977L6AA#ABA"] });
    }
    const tc10Support = supportTerm === "3yr" ? "P37760312" : "P37760112";
    if (skuDescriptions[tc10Support]) {
      results.push({ sku: tc10Support, description: skuDescriptions[tc10Support] });
    }
  }

  // Expansion mic
  if (expansionMic === "Yes") {
    if (roomSize === "Medium" && skuDescriptions["875M6AA"]) {
      results.push({ sku: "875M6AA", description: skuDescriptions["875M6AA"] });
    } else if (roomSize === "Large") {
      const micOptions = ["875M6AA","874R3AA","875S1AA"]
        .filter(sku => skuDescriptions[sku])
        .map(sku => `${sku}: ${skuDescriptions[sku]}`)
        .join("\n\nor\n\n");
      results.push({ sku: "Expansion Mic Options", description: "For Large Rooms: Please choose one of the following:\n\n" + micOptions });
    }
  }

  // Accessories
  accessories.forEach(a => {
    if (skuDescriptions[a]) {
      results.push({ sku: a, description: skuDescriptions[a] });
    }
  });

  // Render results with SKU + description
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
