(() => {
  "use strict";

  const CONFIG = {
    center: [31.4238, 34.391],
    zoom: 15,
    complaintUrl: "https://script.google.com/macros/s/AKfycbxHV85gTu5TkE93USrnR8jcIe5VhsWNLK1DXh8B6lazpi30cEFf6DKAoptzewa0hOqZyw/exec"
  };

  const state = {
    data: {},
    layers: {},
    indexes: [],
    selected: null,
    base: "satellite"
  };

 const map = L.map("map", {
  zoomControl: false,
  minZoom: 15,
  maxZoom: 21,
  maxBoundsViscosity: 1.0
}).setView(CONFIG.center, CONFIG.zoom);


  L.control.zoom({ position: "bottomleft" }).addTo(map);
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

  // ترتيب الطبقات:
  // الأحياء في الأسفل، ثم الشوارع، ثم المباني، والمرافق في الأعلى.
  // كل الطبقات قابلة للضغط، لكن المبنى يأخذ الأولوية عند وجوده فوق الحي.
  map.createPane("neighborhoodsPane");
  map.getPane("neighborhoodsPane").style.zIndex = 410;
  map.getPane("neighborhoodsPane").style.pointerEvents = "auto";

  map.createPane("roadsPane");
  map.getPane("roadsPane").style.zIndex = 420;
  map.getPane("roadsPane").style.pointerEvents = "auto";

  // الخط الأصفر فوق الشوارع وتحت المباني.
  map.createPane("yellowLinePane");
  map.getPane("yellowLinePane").style.zIndex = 425;
  map.getPane("yellowLinePane").style.pointerEvents = "auto";

  map.createPane("buildingsPane");
  map.getPane("buildingsPane").style.zIndex = 430;
  map.getPane("buildingsPane").style.pointerEvents = "auto";

  map.createPane("facilitiesPane");
  map.getPane("facilitiesPane").style.zIndex = 440;
  map.getPane("facilitiesPane").style.pointerEvents = "auto";

  // أسماء المرافق في طبقة مستقلة فوق النقاط والمباني.
  map.createPane("facilityLabelsPane");
  map.getPane("facilityLabelsPane").style.zIndex = 640;
  map.getPane("facilityLabelsPane").style.pointerEvents = "none";
  map.createPane("entrancesPane");
  map.getPane("entrancesPane").style.zIndex = 450;
  map.getPane("entrancesPane").style.pointerEvents = "auto";

  // طبقة مستقلة لأسماء المداخل حتى تبقى فوق المباني والحدود.
  map.createPane("entranceLabelsPane");
  map.getPane("entranceLabelsPane").style.zIndex = 650;
  map.getPane("entranceLabelsPane").style.pointerEvents = "none";

  // طبقة نتائج أقرب خدمة فوق المباني والمرافق حتى يبقى الخط والنقاط واضحين.
  map.createPane("publicToolsPane");
  map.getPane("publicToolsPane").style.zIndex = 720;
  map.getPane("publicToolsPane").style.pointerEvents = "auto";

  const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20, attribution: "&copy; OpenStreetMap contributors"
  });

  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 20, attribution: "Tiles &copy; Esri"
  }).addTo(map);
const styles = {
  // المباني: بيج رمادي فاتح مثل اللون المرجعي.
  buildings: {
    color: "#b8aaa1",
    weight: 1.1,
    opacity: 0.95,
    fillColor: "#d8d0ca",
    fillOpacity: 0.78
  },

  // الشوارع: إعادة اللون والتنسيق القديم.
  roads: {
    color: "#991b1b",
    weight: 2.6,
    opacity: 1,
    fillColor: "#991b1b",
    fillOpacity:0.8,
    lineCap: "round",
    lineJoin: "round"
  },

  yellowLine: {
    color: "#f6c90e",
    weight: 3,
    opacity: 0.7,
    lineCap: "round",
    lineJoin: "round",
    className: "yellow-line-path"
  },

  // حدود الأحياء: موف بدل الأسود أو الكحلي.
  neighborhoods: {
    color: "#7f4a72",
    weight: 3.2,
    opacity: 0.95,
    fillColor: "#9a6b8e",
    fillOpacity: 0.025,
    lineCap: "round",
    lineJoin: "round"
  },

  entrances: {
    color: "#ffffff",
    weight: 2,
    fillColor: "#8b1e3f",
    fillOpacity: 1
  }
};

  const hoverStyles = {
    buildings: {
      color: "#95867d",
      weight: 1.8,
      opacity: 1,
      fillColor: "#d8d0ca",
      fillOpacity: 0.9
    },
    roads: {
      color: "#7f1d1d",
      weight: 4,
      opacity: 1,
      fillColor: "#7f1d1d",
      fillOpacity: 0.24
    },
    yellowLine: { color: "#ffe66d", weight: 4, opacity: 1 },
    neighborhoods: {
      color: "#623758",
      weight: 4.2,
      opacity: 1,
      fillColor: "#9a6b8e",
      fillOpacity: 0.07
    },
    entrances: { color: "#ffffff", weight: 3, fillColor: "#a52a4f", fillOpacity: 1 }
  };

  const labels = {
    "معرف_المبنى": "معرف المبنى",
    "رقم_المبنى": "رقم المبنى",
    "رقم_الشارع": "رقم الشارع",
    "اسم_الحي": "اسم الحي",
    "اسم_الشارع": "اسم الشارع",
    "اسم_المرفق": "اسم المرفق",
    "نوع_المرفق": "نوع المرفق",
    "المساحة_م2": "المساحة (م²)",
    "المحيط_م": "المحيط (م)",
    "نوع_العنصر": "نوع العنصر",
    "اسم_المدخل": "اسم المدخل",
    "اسم_الخط": "اسم الخط"
  };
const files = {
  buildings: "data/buildings.geojson",
  roads: "data/roads.geojson",
  yellowLine: "data/yellow_line.geojson",
  municipalFacilities: "data/municipal_facilities.geojson",
  publicFacilities: "data/public_facilities.geojson",
  entrances: "data/entrances.geojson",
  neighborhoods: "data/neighborhoods.geojson"
};

/* =========================================================
   صور المرافق والطرق والمداخل فقط
   لا يغيّر هذا الجزء أي لون أو طبقة أو وظيفة أخرى في الخريطة.
   ========================================================= */
const detailImageMappings = [
  {
    names: ["بلدية المغازي", "بلدية مغازي", "مبنى البلدية"],
    files: ["بلدية المغازي.jpg", "بلدية مغازي.jpg"]
  },
  {
    names: ["منتزه البلدية", "متنزه البلدية", "المنتزه"],
    files: [
      "المنتزه.jpeg",
      "المنتزه.jpg",
      "المنتزه.JPG",
      "المنتزه.JPEG"
    ]
  },
  {
    names: ["خزان الكوثر", "بئر وخزان الكوثر", "بئر خزان الكوثر"],
    files: ["خزان الكوثر.JPG", "خزان الكوثر.jpg"]
  },
  {
    names: ["دوار المستوصف", "دوار مستوصف"],
    files: ["دوار المستوصف.JPG", "دوار المستوصف.jpg"]
  },
  {
    names: ["شارع أبو بكر الصديق", "شارع ابو بكر الصديق", "أبو بكر الصديق", "ابو بكر الصديق"],
    files: ["شارع أبو بكر الصديق.JPG", "شارع ابو بكر الصديق.JPG", "أبو بكر الصديق.JPG", "ابو بكر الصديق.JPG"]
  },
  {
    names: ["شارع السلطاني", "شارع سلطاني", "شارع السلطاني مدخل الثانوية", "شارع سلطاني مدخل ثانوية"],
    files: ["شارع السلطاني مدخل الثانوية.JPG", "شارع سلطاني مدخل ثانوية.JPG", "شارع السلطاني مدخل التانوية.JPG"]
  },
  {
    names: ["مدخل المغازي الرئيسي", "المدخل الرئيسي", "مدخل المغازي الرئيسي للمخيم"],
    files: ["مدخل.jpg"]
  },
  {
    names: ["مدخل المغازي الشمالي", "المدخل الشمالي", "مدخل المغازي الشمالى", "المدخل الشمالى"],
    files: ["المدخل الشمالي.jpg"]
  },
  {
    names: ["عيادة وكالة الغوث", "عيادة الوكالة", "وكالة الغوث"],
    files: ["عيادة وكالة الغوث.jpg", "مدخل عيادة الوكالة.jpg"]
  },
  {
    names: ["مدرسة المغازي الابتدائية المشتركة", "مدرسة ذكور المغازي الابتدائية", "مدرسة ذكور المغازي الابتدائية المشتركة"],
    files: ["مدرسة المغازي الابتدائية المشتركة.png"]
  },
  {
    names: ["مدرسة مريم بنت عمران", "مريم بنت عمران"],
    files: ["مدرسة مريم بنت عمران.JPG", "مدرسة مريم بنت عمران.jpg"]
  },
  {
    names: ["مركز الصلاح الطبي", "جمعية الصلاح الطبية", "الصلاح الطبي"],
    files: ["مركز الصلاح الطبي.jpg"]
  },
  {
    names: ["مسجد المغازي الكبير", "مسجد مغازي كبير", "مسجد المغازي", "المسجد الكبير"],
    files: ["مسجد المغازي الكبير.jpg", "مسجد مغازي كبير.jpg"]
  },
  {
    names: ["نادي خدمات المغازي", "نادي خدمات المغازي الرياضي"],
    files: ["نادي خدمات المغازي.jpg"]
  },
  {
    names: ["جمعية مركز المغازي الثقافي", "جمعية مركز المغازي", "المركز الثقافي", "مركز المغازي الثقافي"],
    files: ["المركز الثقافي.jpeg"]
  },
  {
    names: [
      "جمعية مركز براعم الماهر",
      "جمعية مركز مركز براعم الماهر",
      "مركز براعم الماهر",
      "المشغل النسائي",
      "مشغل نسائي"
    ],
    files: ["المشغل النسائي.jpeg"]
  }
];

const detailImageStyle = document.createElement("style");
detailImageStyle.textContent = `
  #detailImageBox {
    display: none;
    width: 100%;
    margin: 14px 0 16px;
    overflow: hidden;
    border-radius: 16px;
    background: #f3f4f6;
    border: 1px solid rgba(15, 49, 85, 0.12);
    box-shadow: 0 5px 16px rgba(15, 23, 42, 0.12);
  }

  #detailImageBox img {
    display: block;
    width: 100%;
    height: 190px;
    object-fit: cover;
    object-position: center;
  }

  #detailImageCaption {
    display: block;
    padding: 7px 10px;
    color: #27364a;
    background: rgba(255,255,255,0.96);
    font-family: "Tajawal", Arial, sans-serif;
    font-size: 12px;
    font-weight: 800;
    text-align: center;
  }

  @media (max-width: 700px) {
    #detailImageBox img { height: 155px; }
  }
`;
document.head.appendChild(detailImageStyle);

function normalizeDetailImageName(value) {
  return String(value || "")
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getDetailImageItemName(type, properties) {
  if (type === "municipalFacilities" || type === "publicFacilities") {
    return properties["اسم_المرفق"] || properties["الاسم"] || properties["Name"] || properties["name"] || "";
  }

  if (type === "roads") {
    return properties["اسم_الشارع"] || properties["الاسم"] || properties["Name"] || properties["name"] || "";
  }

  if (type === "entrances") {
    return properties["اسم_المدخل"] || properties["الاسم"] || properties["Name"] || properties["name"] || "";
  }

  return "";
}

function findDetailImageMapping(itemName) {
  const normalizedItemName = normalizeDetailImageName(itemName);
  if (!normalizedItemName) return null;

  // نبحث عن التطابق الكامل أولاً حتى لا يلتقط اسم "مدخل" عناصر أخرى.
  for (const mapping of detailImageMappings) {
    if (mapping.names.some(name => normalizeDetailImageName(name) === normalizedItemName)) {
      return mapping;
    }
  }

  // ثم نقبل التطابق الجزئي للأسماء الطويلة فقط.
  for (const mapping of detailImageMappings) {
    if (mapping.names.some(name => {
      const normalizedAlias = normalizeDetailImageName(name);
      return normalizedAlias.length >= 8 &&
        (normalizedItemName.includes(normalizedAlias) || normalizedAlias.includes(normalizedItemName));
    })) {
      return mapping;
    }
  }

  return null;
}

function ensureDetailImageBox() {
  let box = document.getElementById("detailImageBox");
  if (box) return box;

  box = document.createElement("figure");
  box.id = "detailImageBox";
  box.innerHTML = `
    <img id="detailImage" src="" alt="صورة العنصر">
    <figcaption id="detailImageCaption"></figcaption>
  `;

  const detailFields = document.getElementById("detailFields");
  if (detailFields && detailFields.parentNode) {
    detailFields.parentNode.insertBefore(box, detailFields);
  }

  return box;
}

function hideDetailImage() {
  const box = document.getElementById("detailImageBox");
  const image = document.getElementById("detailImage");
  if (image) {
    image.onload = null;
    image.onerror = null;
    image.removeAttribute("src");
  }
  if (box) box.style.display = "none";
}

function tryDetailImageFiles(image, box, caption, itemName, files, index = 0) {
  if (index >= files.length) {
    hideDetailImage();
    return;
  }

  const imagePath = `images/facilities/${files[index]}`;
  const imageUrl = new URL(imagePath, document.baseURI);

  // كسر كاش محاولات التحميل القديمة، خصوصًا إذا كان المسار قد أعطى 404 سابقًا.
  imageUrl.searchParams.set("imgv", "20260726-park-fix");

  image.onload = () => {
    caption.textContent = itemName;
    box.style.display = "block";
  };

  image.onerror = () => {
    console.warn("تعذر تحميل صورة العنصر:", imageUrl.href);
    tryDetailImageFiles(image, box, caption, itemName, files, index + 1);
  };

  image.src = imageUrl.href;
}

function updateDetailImage(type, properties) {
  const supportedType =
    type === "municipalFacilities" ||
    type === "publicFacilities" ||
    type === "roads" ||
    type === "entrances";

  if (!supportedType) {
    hideDetailImage();
    return;
  }

  const itemName = getDetailImageItemName(type, properties);
  const mapping = findDetailImageMapping(itemName);

  if (!mapping) {
    hideDetailImage();
    return;
  }

  const box = ensureDetailImageBox();
  const image = document.getElementById("detailImage");
  const caption = document.getElementById("detailImageCaption");

  box.style.display = "none";
  tryDetailImageFiles(image, box, caption, itemName, mapping.files);
}


  // تنسيق أسماء المداخل على الشارع المقابل لكل نقطة مباشرة.
  // إعادة بناء بطاقات الإحصائيات بحجم صغير فعليًا بدل الاعتماد على CSS الصفحة القديم.
  const statisticsStyle = document.createElement("style");
  statisticsStyle.textContent = `
    .forced-compact-stats {
      display: flex !important;
      flex-wrap: nowrap !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 12px !important;
      width: 100% !important;
      min-height: 0 !important;
      height: auto !important;
      padding: 7px 12px !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      background: transparent !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
    }

    .forced-stat-card {
      display: grid !important;
      grid-template-columns: 28px 1fr !important;
      grid-template-rows: auto auto !important;
      column-gap: 7px !important;
      align-items: center !important;
      flex: 0 0 112px !important;
      width: 112px !important;
      min-width: 112px !important;
      max-width: 112px !important;
      min-height: 48px !important;
      height: 48px !important;
      padding: 5px 8px !important;
      margin: 0 !important;
      border-radius: 11px !important;
      box-sizing: border-box !important;
      background: rgba(250, 248, 244, 0.94) !important;
      border: 1px solid rgba(143, 29, 29, 0.18) !important;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12) !important;
      backdrop-filter: blur(5px) !important;
    }

    .forced-stat-card i {
      grid-column: 1 !important;
      grid-row: 1 / 3 !important;
      justify-self: center !important;
      color: #8f1d1d !important;
      font-size: 17px !important;
      line-height: 1 !important;
    }

    .forced-stat-value {
      grid-column: 2 !important;
      grid-row: 1 !important;
      color: #172536 !important;
      font-size: 16px !important;
      line-height: 1 !important;
      font-weight: 900 !important;
      direction: ltr !important;
      unicode-bidi: isolate !important;
      font-variant-numeric: tabular-nums !important;
      white-space: nowrap !important;
    }

    .forced-stat-label {
      grid-column: 2 !important;
      grid-row: 2 !important;
      color: #263548 !important;
      font-size: 12px !important;
      line-height: 1 !important;
      font-weight: 900 !important;
      white-space: nowrap !important;
    }

    @media (max-width: 760px) {
      .forced-compact-stats {
        justify-content: flex-start !important;
        gap: 8px !important;
        padding: 6px 8px !important;
      }

      .forced-stat-card {
        flex-basis: 104px !important;
        width: 104px !important;
        min-width: 104px !important;
        max-width: 104px !important;
        height: 46px !important;
        min-height: 46px !important;
        padding: 4px 7px !important;
      }
    }
  `;
  document.head.appendChild(statisticsStyle);

  function findOriginalStatCard(valueElement) {
    let card = valueElement.closest(
      ".stat-card, .stats-card, .stat-item, .stat-box, .summary-card, .counter-card"
    );

    if (card) return card;

    let candidate = valueElement.parentElement;
    for (let level = 0; candidate && level < 5; level += 1) {
      const hasIcon = Boolean(candidate.querySelector("i, svg"));
      const textLength = (candidate.innerText || "").trim().length;
      if (hasIcon && textLength > 0 && textLength < 100) return candidate;
      candidate = candidate.parentElement;
    }

    return valueElement.parentElement;
  }

  function compactStatisticsCards() {
    if (document.querySelector(".forced-compact-stats")) return;

    const definitions = [
      { sourceId: "statBuildings", targetId: "compactStatBuildings", label: "مبنى", icon: "fa-solid fa-building" },
      { sourceId: "statNeighborhoods", targetId: "compactStatNeighborhoods", label: "حي", icon: "fa-solid fa-border-all" },
      { sourceId: "statRoads", targetId: "compactStatRoads", label: "شارع هيكلي", icon: "fa-solid fa-road" },
      { sourceId: "statMunicipalFacilities", targetId: "compactStatMunicipalFacilities", label: "مرفق بلدي", icon: "fa-solid fa-building-columns" },
      { sourceId: "statPublicFacilities", targetId: "compactStatPublicFacilities", label: "مرفق عام", icon: "fa-solid fa-location-dot" }
    ];

    const originals = definitions
      .map(definition => {
        const valueElement = document.getElementById(definition.sourceId);
        if (!valueElement) return null;
        return {
          ...definition,
          valueElement,
          card: findOriginalStatCard(valueElement)
        };
      })
      .filter(Boolean);

    if (!originals.length) return;

    const firstCard = originals[0].card;
    const commonParent = firstCard?.parentElement;
    if (!commonParent) return;

    originals.forEach(item => {
      item.card.style.setProperty("display", "none", "important");
    });

    commonParent.style.setProperty("display", "block", "important");
    commonParent.style.setProperty("width", "100%", "important");
    commonParent.style.setProperty("height", "auto", "important");
    commonParent.style.setProperty("min-height", "0", "important");
    commonParent.style.setProperty("padding", "0", "important");
    commonParent.style.setProperty("margin", "0", "important");
    commonParent.style.setProperty("background", "transparent", "important");

    const compactContainer = document.createElement("div");
    compactContainer.className = "forced-compact-stats";

    originals.forEach(item => {
      const card = document.createElement("div");
      card.className = "forced-stat-card";
      card.innerHTML = `
        <i class="${item.icon}" aria-hidden="true"></i>
        <strong class="forced-stat-value" id="${item.targetId}">${item.valueElement.textContent || "0"}</strong>
        <span class="forced-stat-label">${item.label}</span>
      `;
      compactContainer.appendChild(card);
    });

    commonParent.appendChild(compactContainer);
  }

  const mapLabelStyle = document.createElement("style");
  mapLabelStyle.textContent = `
    .yellow-line-path {
      filter: drop-shadow(0 1px 1px rgba(45, 35, 0, 0.25));
    }

    .entrance-name-label {
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      pointer-events: none !important;
      overflow: visible !important;
    }

    .entrance-label-rotator {
      width: 240px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffd400;
      font-family: "Tajawal", Arial, sans-serif;
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
      white-space: nowrap;
      direction: rtl;
      transform-origin: center center;
      transform: rotate(var(--entrance-angle, -43deg));
      text-shadow:
        -1px -1px 0 #211800,
         1px -1px 0 #211800,
        -1px  1px 0 #211800,
         1px  1px 0 #211800,
         0 2px 3px rgba(0, 0, 0, 0.85);
    }

    @media (max-width: 700px) {
      .entrance-label-rotator {
        width: 205px;
        font-size: 10px;
      }
    }


    /* أسماء المرافق: تبقى قريبة من نقاطها، مع منع التداخل. */
    .facility-name-label {
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      pointer-events: none !important;
      overflow: visible !important;
      text-align: center !important;
    }

    .facility-name-label span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: max-content;
      max-width: 118px;
      min-height: 18px;
      padding: 2px 5px;
      border-radius: 8px;
      box-sizing: border-box;
      font-family: "Tajawal", Arial, sans-serif;
      font-size: 9px;
      font-weight: 800;
      line-height: 1.1;
      white-space: normal;
      text-align: center;
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.94);
      box-shadow: 0 1px 3px rgba(0,0,0,0.38);
    }

    .facility-public-label span {
      background: rgba(180, 83, 9, 0.94);
    }

    .facility-municipal-label span {
      background: rgba(22, 101, 52, 0.94);
    }


    .facility-hover-tooltip {
      direction: rtl;
      font-family: "Tajawal", Arial, sans-serif;
      font-size: 11px;
      font-weight: 800;
      color: #172033;
      background: rgba(255,255,255,0.97);
      border: 1px solid rgba(23,32,51,0.18);
      border-radius: 7px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.22);
      padding: 4px 7px;
    }
  `;
  document.head.appendChild(mapLabelStyle);

  // تنسيق علامة نتيجة البحث: دبوس أصفر يتحرك لأعلى وأسفل.
  const searchTargetAnimationStyle = document.createElement("style");
  searchTargetAnimationStyle.textContent = `
    .search-target-pin-icon {
      background: transparent !important;
      border: 0 !important;
      overflow: visible !important;
      pointer-events: none !important;
    }

    .search-target-pin-bounce {
      position: relative;
      width: 34px;
      height: 42px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      animation: searchTargetBounce 1.05s ease-in-out infinite;
      transform-origin: center bottom;
      filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.35));
    }

    .search-target-pin-shape {
      position: relative;
      width: 28px;
      height: 28px;
      background: #facc15;
      border: 3px solid #ffffff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-sizing: border-box;
    }

    .search-target-pin-shape::after {
      content: "";
      position: absolute;
      width: 8px;
      height: 8px;
      left: 50%;
      top: 50%;
      background: #7c2d12;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }

    .search-target-pin-shadow {
      position: absolute;
      left: 50%;
      bottom: 0;
      width: 22px;
      height: 7px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.3);
      transform: translateX(-50%);
      animation: searchTargetShadow 1.05s ease-in-out infinite;
    }

    @keyframes searchTargetBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }

    @keyframes searchTargetShadow {
      0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.32; }
      50% { transform: translateX(-50%) scale(0.68); opacity: 0.16; }
    }

    @media (prefers-reduced-motion: reduce) {
      .search-target-pin-bounce,
      .search-target-pin-shadow {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(searchTargetAnimationStyle);


  function numberFrom(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number(String(value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeFeatureProperties(type, feature) {
    const p = feature.properties || (feature.properties = {});

    if (type === "neighborhoods") {
      p["اسم_الحي"] = p["اسم_الحي"] || p["الاسم"] || p["Name"] || p["الرقم"] || "حي";

      const area = numberFrom(
        p["المساحة_م2"] ?? p["SHAPE_Area"] ?? p["Shape_Area"] ?? p["المساحة"]
      );
      const perimeter = numberFrom(
        p["المحيط_م"] ?? p["SHAPE_Length"] ?? p["Shape_Length"]
      );

      if (area !== null) p["المساحة_م2"] = Number(area.toFixed(2));
      if (perimeter !== null) p["المحيط_م"] = Number(perimeter.toFixed(2));
      p["نوع_العنصر"] = p["نوع_العنصر"] || "حي";
    }

    if (type === "buildings") {
      p["رقم_المبنى"] = p["رقم_المبنى"] ?? p["BUILDING_NUMBER"] ?? null;
      p["رقم_الشارع"] = p["رقم_الشارع"] ?? p["STREET_NUMBER"] ?? null;
      p["نوع_العنصر"] = p["نوع_العنصر"] || "مبنى سكني";
    }

    if (type === "roads") {
      p["اسم_الشارع"] = p["اسم_الشارع"] || p["Name"] || "شارع";
      p["نوع_العنصر"] = p["نوع_العنصر"] || "شارع";
    }

    if (type === "yellowLine") {
      p["اسم_الخط"] =
        p["اسم_الخط"] ||
        p["الاسم"] ||
        p["Name"] ||
        p["name"] ||
        "الخط الأصفر";
      p["نوع_العنصر"] = p["نوع_العنصر"] || "خط أصفر";
    }

    if (type === "entrances") {
      p["اسم_المدخل"] = p["اسم_المدخل"] || p["الاسم"] || p["Name"] || p["name"] || "مدخل";
      p["نوع_العنصر"] = p["نوع_العنصر"] || "مدخل";
    }

    return feature;
  }

  function escapeHtml(value) {
    return String(value ?? "—").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[c]));
  }

  function centroid(layer) {
    if (layer.getLatLng) return layer.getLatLng();
    if (layer.getBounds) return layer.getBounds().getCenter();
    return map.getCenter();
  }

  
  const neighborhoodLabelsLayer = L.layerGroup();

  function getNeighborhoodName(feature) {
    const props = feature?.properties || {};
    return (
      props["اسم_الحي"] ||
      props["الاسم"] ||
      props["Name"] ||
      props["NAME"] ||
      ""
    );
  }

  function pointInsideRingForLabel(lat, lng, ring) {
    if (!Array.isArray(ring) || ring.length < 3) return false;

    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0]; // lng
      const yi = ring[i][1]; // lat

      const xj = ring[j][0]; // lng
      const yj = ring[j][1]; // lat

      const intersects =
        ((yi > lat) !== (yj > lat)) &&
        (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);

      if (intersects) inside = !inside;
    }

    return inside;
  }

  function pointInsideGeometryForLabel(lat, lng, geometry) {
    if (!geometry) return false;

    if (geometry.type === "Polygon") {
      return pointInsideRingForLabel(lat, lng, geometry.coordinates?.[0]);
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.some(polygon =>
        pointInsideRingForLabel(lat, lng, polygon?.[0])
      );
    }

    return false;
  }

  function findBestLabelPointInside(layer) {
    const feature = layer.feature;
    const geometry = feature?.geometry;

    if (!layer.getBounds || !geometry) {
      return centroid(layer);
    }

    const bounds = layer.getBounds();
    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    let bestPoint = null;
    let bestScore = -Infinity;

    // نقاط تجريبية داخل حدود الحي، لاختيار نقطة تكون داخل المضلع وليست على الأطراف
    const rows = 10;
    const cols = 10;

    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const lat = south + ((north - south) * i) / rows;
        const lng = west + ((east - west) * j) / cols;

        if (!pointInsideGeometryForLabel(lat, lng, geometry)) continue;

        const point = L.latLng(lat, lng);

        const edgeScore = Math.min(
          Math.abs(lat - south),
          Math.abs(north - lat),
          Math.abs(lng - west),
          Math.abs(east - lng)
        );

        // نفضل النقطة الأقرب لمركز حدود الحي، لكن داخل المضلع
        const center = bounds.getCenter();
        const centerDistance = point.distanceTo(center);
        const score = edgeScore * 100000 - centerDistance;

        if (score > bestScore) {
          bestScore = score;
          bestPoint = point;
        }
      }
    }

    // إذا شكل الحي صعب جدًا، نستخدم مركز الحدود كحل احتياطي
    return bestPoint || bounds.getCenter();
  }

  function addNeighborhoodLabels(neighborhoodLayerGroup) {
    if (!map.hasLayer(neighborhoodLabelsLayer)) {
      neighborhoodLabelsLayer.addTo(map);
    }

    neighborhoodLabelsLayer.clearLayers();

    neighborhoodLayerGroup.eachLayer(layer => {
      const name = getNeighborhoodName(layer.feature);
      if (!name) return;

      const labelPoint = findBestLabelPointInside(layer);

      const labelMarker = L.marker(labelPoint, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "neighborhood-name-label",
          html: `<span>${escapeHtml(name)}</span>`,
          iconSize: [110, 26],
          iconAnchor: [55, 13]
        })
      });

      neighborhoodLabelsLayer.addLayer(labelMarker);
    });
  }

  function isBuildingType(type) {
    return type === "buildings";
  }

 function titleFor(type, p) {
  if (isBuildingType(type)) return p["رقم_المبنى"] ? `مبنى رقم ${p["رقم_المبنى"]}` : "مبنى";
  if (type === "neighborhoods") return p["اسم_الحي"] || p["الاسم"] || "حي";
  if (type === "roads") return p["اسم_الشارع"] || p["Name"] || "شارع";
  if (type === "yellowLine") return p["اسم_الخط"] || p["الاسم"] || p["Name"] || "الخط الأصفر";
  if (type === "entrances") return p["اسم_المدخل"] || p["الاسم"] || p["Name"] || "مدخل";
  return p["اسم_المرفق"] || p["الاسم"] || (type === "publicFacilities" ? "مرفق عام" : "مرفق بلدي");
}

  function subtitleFor(type, p) {
  return ({
    buildings: "مبنى سكني",
    neighborhoods: "حي",
    roads: "شارع",
    yellowLine: "الخط الأصفر",
    municipalFacilities: "مرفق بلدي",
    publicFacilities: "مرفق عام",
    entrances: "مدخل"
  })[type];
}

  function showDetails(type, feature, layer) {
    const p = feature.properties || {};

    // عرض الصورة المرتبطة بالمرفق أو الشارع أو المدخل فقط.
    updateDetailImage(type, p);
    const c = centroid(layer);
    state.selected = { type, feature, layer, latlng: c };

    document.getElementById("detailType").textContent = subtitleFor(type, p);
    document.getElementById("detailTitle").textContent = titleFor(type, p);
    document.getElementById("detailSubtitle").textContent = `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;

    const allowed = isBuildingType(type)
      ? ["رقم_المبنى","رقم_الشارع","المساحة_م2","المحيط_م","نوع_العنصر"]
      : type === "neighborhoods"
        ? ["اسم_الحي","المساحة_م2","المحيط_م","نوع_العنصر"]
        : type === "roads"
          ? ["اسم_الشارع","المساحة_م2","المحيط_م","نوع_العنصر"]
          : type === "yellowLine"
            ? ["اسم_الخط","نوع_العنصر"]
          : type === "entrances"
            ? ["اسم_المدخل","نوع_العنصر"]
            : type === "publicFacilities"
              ? ["اسم_المرفق","نوع_المرفق","نوع_العنصر"]
              : ["اسم_المرفق","نوع_المرفق","نوع_العنصر"];

    document.getElementById("detailFields").innerHTML = allowed.map(key => {
      const value = p[key];
      return `<div class="detail-row"><span>${labels[key] || key}</span><strong>${escapeHtml(value)}</strong></div>`;
    }).join("");

    document.getElementById("googleMapsBtn").href = `https://www.google.com/maps?q=${c.lat},${c.lng}`;
    document.getElementById("complaintBtn").href = `${CONFIG.complaintUrl}?lat=${encodeURIComponent(c.lat)}&lng=${encodeURIComponent(c.lng)}&title=${encodeURIComponent(titleFor(type,p))}`;
    document.getElementById("detailsPanel").classList.add("open");

    // إذا كانت شاشة أقرب خدمة مفتوحة، ضع معلومات العنصر في الجهة المقابلة فورًا.
    requestAnimationFrame(applySeparatedPanelsLayout);

    const url = new URL(location.href);
    url.searchParams.set("type", type);
    const id =
      p["معرف_المبنى"] ||
      p["اسم_الحي"] ||
      p["اسم_الشارع"] ||
      p["اسم_المرفق"] ||
      p["اسم_المدخل"] ||
      p["اسم_الخط"] ||
      "";
    if (id) url.searchParams.set("id", id);
    history.replaceState(null, "", url);
  }

  function wireFeature(type, feature, layer) {
    const base = styles[type];

    // عند تحديد مبنى نخفي لون التعبئة ونُبقي حدًا واضحًا حوله.
    const selectedBuildingStyle = {
      ...base,
      color: "#7a4a24",
      weight: 2.4,
      opacity: 1,
      fillOpacity: 0
    };

    layer.on({
      mouseover() {
        // لا نعيد لون التعبئة للمبنى المحدد عند مرور المؤشر فوقه.
        if (state.selected?.layer === layer && type === "buildings") {
          layer.setStyle(selectedBuildingStyle);
          return;
        }

        if (base) {
          layer.setStyle({ ...base, ...hoverStyles[type] });
        }
      },

      mouseout() {
        if (!base) return;

        if (state.selected?.layer === layer && type === "buildings") {
          layer.setStyle(selectedBuildingStyle);
          return;
        }

        if (state.selected?.layer !== layer) {
          layer.setStyle(base);
        }
      },

      click() {
        // إعادة العنصر المحدد سابقًا إلى لونه الطبيعي.
        if (
          state.selected?.layer &&
          state.selected.layer.setStyle &&
          styles[state.selected.type]
        ) {
          state.selected.layer.setStyle(styles[state.selected.type]);
        }

        if (base) {
          if (type === "buildings") {
            // إخفاء لون المبنى المختار لإظهار صورة القمر الصناعي تحته.
            layer.setStyle(selectedBuildingStyle);
          } else {
            layer.setStyle({ ...base, ...hoverStyles[type] });
          }
        }

        if (layer.bringToFront) layer.bringToFront();
        showDetails(type, feature, layer);
      }
    });
  }

  function facilityPoint(type, latlng) {
    // ألوان المرافق أوضح: العام كهرماني، البلدي أخضر داكن، مع حدود غامقة
    const fillColor = type === "publicFacilities" ? "#b45309" : "#166534";
    const borderColor = type === "publicFacilities" ? "#3b2208" : "#052e16";

    return L.circleMarker(latlng, {
      radius:  4.5,
      color: borderColor,
      weight: 1.5,
      fillColor,
      fillOpacity: 1,
      pane: "facilitiesPane"
    });
  }

  function getEntranceStreetAngle() {
    const entranceFeatures = state.data.entrances?.features || [];
    const pointFeatures = entranceFeatures.filter(
      feature => feature?.geometry?.type === "Point"
    );

    if (pointFeatures.length < 2) return -43;

    const firstCoordinates = pointFeatures[0].geometry.coordinates;
    const secondCoordinates = pointFeatures[1].geometry.coordinates;

    const firstPoint = map.latLngToLayerPoint(
      L.latLng(firstCoordinates[1], firstCoordinates[0])
    );
    const secondPoint = map.latLngToLayerPoint(
      L.latLng(secondCoordinates[1], secondCoordinates[0])
    );

    let angle = Math.atan2(
      secondPoint.y - firstPoint.y,
      secondPoint.x - firstPoint.x
    ) * 180 / Math.PI;

    // إبقاء الكتابة مقروءة وعدم قلبها رأسًا على عقب.
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;

    return Number.isFinite(angle) ? angle : -43;
  }

  function entrancePoint(feature, latlng) {
    return L.circleMarker(latlng, {
      radius: 5,
      color: "#ffffff",
      weight: 2,
      fillColor: "#8b1e3f",
      fillOpacity: 1,
      pane: "entrancesPane"
    });
  }



  /* =========================================================
     Facility and entrance labels + search target highlight
     أسماء المرافق تظهر عند التكبير + تحديد واضح لنتيجة البحث
     ========================================================= */

  const facilityLabelsLayer = L.layerGroup();
  const facilityLabelConnectorsLayer = L.layerGroup();
  const entranceLabelsLayer = L.layerGroup();
  const searchHighlightLayer = L.layerGroup().addTo(map);

  function getFacilityName(feature) {
    const props = feature?.properties || {};
    return (
      props["اسم_المرفق"] ||
      props["الاسم"] ||
      props["Name"] ||
      props["name"] ||
      ""
    );
  }

  function addFacilityLabels(type, facilityLayerGroup) {
    if (!map.hasLayer(facilityLabelsLayer)) {
      facilityLabelsLayer.addTo(map);
    }

    if (!map.hasLayer(facilityLabelConnectorsLayer)) {
      facilityLabelConnectorsLayer.addTo(map);
    }

    facilityLayerGroup.eachLayer(layer => {
      const name = getFacilityName(layer.feature);
      if (!name) return;

      const sourceLatLng = centroid(layer);

      // الاسم الكامل يظهر عند المرور على النقطة.
      layer.bindTooltip(escapeHtml(name), {
        permanent: false,
        sticky: true,
        direction: "top",
        offset: [0, -7],
        className: "facility-hover-tooltip"
      });

      const labelMarker = L.marker(sourceLatLng, {
        interactive: false,
        keyboard: false,
        pane: "facilityLabelsPane",
        icon: L.divIcon({
          className: `facility-name-label ${type === "publicFacilities" ? "facility-public-label" : "facility-municipal-label"}`,
          html: `<span>${escapeHtml(name)}</span>`,
          iconSize: [112, 34],
          // أسفل بطاقة الاسم يكون فوق نقطة المرفق.
          iconAnchor: [56, 34]
        })
      });

      labelMarker._facilityType = type;
      labelMarker._facilityName = name;
      labelMarker._sourceLatLng = sourceLatLng;
      facilityLabelsLayer.addLayer(labelMarker);
    });

    requestAnimationFrame(updateFacilityLabelsVisibility);
  }

  function facilityRectsOverlap(a, b, margin = 3) {
    return !(
      a.right + margin <= b.left ||
      a.left >= b.right + margin ||
      a.bottom + margin <= b.top ||
      a.top >= b.bottom + margin
    );
  }

  function facilityRectOverlapArea(a, b) {
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return width * height;
  }

  function getFacilityLabelSize(name, compact = false) {
    const length = String(name || "").length;

    if (compact) {
      return {
        width: Math.min(98, Math.max(62, 26 + length * 4.25)),
        height: length > 18 ? 28 : 20,
        fontSize: 8
      };
    }

    return {
      width: Math.min(118, Math.max(64, 28 + length * 4.7)),
      height: length > 18 ? 31 : 22,
      fontSize: 9
    };
  }

  function buildFacilityLabelCandidates(sourcePoint, width, height) {
    const gap = 7;
    const sideX = width / 2 + gap;
    const sideY = height / 2;

    // المواضع كلها قريبة من النقطة: فوق، يمين، يسار، ثم أسفل.
    // لا نُبعد الاسم بعيدًا ولا نرسم خطوطًا بينه وبين النقطة.
    const offsets = [
      [0, -8],
      [sideX, sideY],
      [-sideX, sideY],
      [0, height + 9],
      [sideX * 0.78, -7],
      [-sideX * 0.78, -7],
      [sideX * 0.78, height + 7],
      [-sideX * 0.78, height + 7],
      [0, -(height + 11)]
    ];

    return offsets.map(([dx, dy]) => ({
      point: L.point(sourcePoint.x + dx, sourcePoint.y + dy),
      distance: Math.hypot(dx, dy)
    }));
  }

  function findFacilityLabelPlacement(sourcePoint, size, placedRects, mapSize, topReserved) {
    const candidates = buildFacilityLabelCandidates(
      sourcePoint,
      size.width,
      size.height
    );

    let bestFallback = null;

    for (const candidate of candidates) {
      // candidate.point يمثل أسفل منتصف بطاقة الاسم.
      const rect = {
        left: candidate.point.x - size.width / 2,
        right: candidate.point.x + size.width / 2,
        top: candidate.point.y - size.height,
        bottom: candidate.point.y
      };

      const insideMap =
        rect.left >= 4 &&
        rect.right <= mapSize.x - 4 &&
        rect.top >= topReserved &&
        rect.bottom <= mapSize.y - 4;

      if (!insideMap) continue;

      const overlapArea = placedRects.reduce(
        (sum, existing) => sum + facilityRectOverlapArea(rect, existing),
        0
      );

      if (overlapArea === 0) {
        return { point: candidate.point, rect, overlapArea: 0 };
      }

      const score = overlapArea * 1000 + candidate.distance;
      if (!bestFallback || score < bestFallback.score) {
        bestFallback = {
          point: candidate.point,
          rect,
          overlapArea,
          score
        };
      }
    }

    return bestFallback;
  }

  function updateFacilityLabelsVisibility() {
    const zoom = map.getZoom();

    // من بعيد تظهر النقاط فقط. عند الاقتراب (Zoom 18+) تظهر أسماء كل المرافق.
    if (zoom < 18) {
      if (map.hasLayer(facilityLabelsLayer)) {
        map.removeLayer(facilityLabelsLayer);
      }
      facilityLabelConnectorsLayer.clearLayers();
      return;
    }

    if (!map.hasLayer(facilityLabelsLayer)) {
      facilityLabelsLayer.addTo(map);
    }

    // لا نستخدم أي خطوط ربط بين الاسم والنقطة.
    facilityLabelConnectorsLayer.clearLayers();
    if (map.hasLayer(facilityLabelConnectorsLayer)) {
      map.removeLayer(facilityLabelConnectorsLayer);
    }

    const labelsToPlace = [];

    facilityLabelsLayer.eachLayer(label => {
      const type = label._facilityType;
      const visible = state.layers[type] && map.hasLayer(state.layers[type]);
      const el = label.getElement();

      if (!visible || !label._sourceLatLng) {
        if (el) el.style.display = "none";
        return;
      }

      labelsToPlace.push(label);
    });

    // ترتيب ثابت حسب موقع النقطة على الشاشة لتقليل حركة الأسماء عند التحريك.
    labelsToPlace.sort((a, b) => {
      const pa = map.latLngToLayerPoint(a._sourceLatLng);
      const pb = map.latLngToLayerPoint(b._sourceLatLng);
      return pa.y - pb.y || pa.x - pb.x;
    });

    const placedRects = [];
    const mapSize = map.getSize();
    const topReserved = 76;

    labelsToPlace.forEach(label => {
      const el = label.getElement();
      if (!el) return;

      const sourcePoint = map.latLngToLayerPoint(label._sourceLatLng);

      // نجرب الحجم الطبيعي أولًا، ثم حجمًا أصغر إذا كانت المنطقة مزدحمة.
      let size = getFacilityLabelSize(label._facilityName, false);
      let placement = findFacilityLabelPlacement(
        sourcePoint,
        size,
        placedRects,
        mapSize,
        topReserved
      );

      if (!placement || placement.overlapArea > 0) {
        const compactSize = getFacilityLabelSize(label._facilityName, true);
        const compactPlacement = findFacilityLabelPlacement(
          sourcePoint,
          compactSize,
          placedRects,
          mapSize,
          topReserved
        );

        if (
          compactPlacement &&
          (!placement || compactPlacement.overlapArea <= placement.overlapArea)
        ) {
          size = compactSize;
          placement = compactPlacement;
        }
      }

      // حتى في الازدحام الشديد لا نخفي أي مرفق؛ نستخدم أقل موضع تداخل.
      if (!placement) {
        placement = {
          point: L.point(sourcePoint.x, sourcePoint.y - 8),
          rect: {
            left: sourcePoint.x - size.width / 2,
            right: sourcePoint.x + size.width / 2,
            top: sourcePoint.y - 8 - size.height,
            bottom: sourcePoint.y - 8
          },
          overlapArea: 0
        };
      }

      label.setLatLng(map.layerPointToLatLng(placement.point));
      el.style.display = "block";
      el.style.width = `${size.width}px`;

      const span = el.querySelector("span");
      if (span) {
        span.style.maxWidth = `${size.width}px`;
        span.style.fontSize = `${size.fontSize}px`;
      }

      placedRects.push(placement.rect);
    });
  }

  function getEntranceName(feature) {
    const props = feature?.properties || {};
    return (
      props["اسم_المدخل"] ||
      props["الاسم"] ||
      props["Name"] ||
      props["name"] ||
      ""
    );
  }

  function getYellowLineCoordinateSets(geometry) {
    if (!geometry || !geometry.coordinates) return [];

    if (geometry.type === "LineString") {
      return [geometry.coordinates];
    }

    if (geometry.type === "MultiLineString") {
      return geometry.coordinates;
    }

    if (geometry.type === "Polygon") {
      return geometry.coordinates;
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.flat();
    }

    return [];
  }

  /*
   * إيجاد أقرب جزء من الخط الأصفر للمدخل، ثم استخدام زاويته
   * حتى يكون اسم المدخل موازيًا للشارع بدل أن يبقى أفقيًا.
   */
  /*
   * وضع اسم كل مدخل على الشارع المقابل للنقطة مباشرة:
   * نستخدم اتجاه الخط بين نقطتي المدخلين، ثم نحرك الاسم عموديًا
   * مسافة صغيرة باتجاه خارج منطقة الخريطة، من دون إبعاده على طول الشارع.
   */
  function getEntranceStreetPlacement(entranceLatLng) {
    const entranceFeatures = state.data.entrances?.features || [];
    const points = entranceFeatures
      .filter(feature => feature?.geometry?.type === "Point")
      .map(feature => L.latLng(
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0]
      ));

    if (points.length < 2) {
      return { angle: -43, latlng: entranceLatLng };
    }

    const firstPoint = map.latLngToLayerPoint(points[0]);
    const secondPoint = map.latLngToLayerPoint(points[1]);
    const entrancePointOnMap = map.latLngToLayerPoint(entranceLatLng);

    const dx = secondPoint.x - firstPoint.x;
    const dy = secondPoint.y - firstPoint.y;
    const length = Math.hypot(dx, dy) || 1;

    const tangentX = dx / length;
    const tangentY = dy / length;

    let angle = (Math.atan2(tangentY, tangentX) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;

    // اتجاهان عموديان على الشارع؛ نختار الجهة الأبعد عن مركز الخريطة
    // لأنها جهة الشارع الخارجي المقابل لنقاط المداخل.
    const normalAX = -tangentY;
    const normalAY = tangentX;
    const normalBX = tangentY;
    const normalBY = -tangentX;
    const roadOffsetPixels = 34;

    const candidateA = L.point(
      entrancePointOnMap.x + normalAX * roadOffsetPixels,
      entrancePointOnMap.y + normalAY * roadOffsetPixels
    );
    const candidateB = L.point(
      entrancePointOnMap.x + normalBX * roadOffsetPixels,
      entrancePointOnMap.y + normalBY * roadOffsetPixels
    );

    const centerPoint = map.latLngToLayerPoint(map.getCenter());
    const labelPoint = candidateA.distanceTo(centerPoint) >= candidateB.distanceTo(centerPoint)
      ? candidateA
      : candidateB;

    return {
      angle,
      latlng: map.layerPointToLatLng(labelPoint)
    };
  }

  function createEntranceLabelIcon(name, angle) {
    return L.divIcon({
      className: "entrance-name-label",
      html: `<div class="entrance-label-rotator" style="--entrance-angle:${angle.toFixed(2)}deg">${escapeHtml(name)}</div>`,
      iconSize: [240, 28],
      iconAnchor: [120, 14]
    });
  }

  function updateEntranceLabelGeometry() {
    entranceLabelsLayer.eachLayer(labelMarker => {
      const sourceLayer = labelMarker._entranceSourceLayer;
      const name = labelMarker._entranceName;

      if (!sourceLayer || !name) return;

      const entranceLatLng = centroid(sourceLayer);
      const placement = getEntranceStreetPlacement(entranceLatLng);

      labelMarker.setLatLng(placement.latlng);
      labelMarker.setIcon(createEntranceLabelIcon(name, placement.angle));
    });
  }

  function addEntranceLabels(entranceLayerGroup) {
    entranceLabelsLayer.clearLayers();

    entranceLayerGroup.eachLayer(layer => {
      const name = getEntranceName(layer.feature);
      if (!name) return;

      const labelMarker = L.marker(centroid(layer), {
        interactive: false,
        keyboard: false,
        pane: "entranceLabelsPane",
        icon: createEntranceLabelIcon(name, 0)
      });

      labelMarker._entranceSourceLayer = layer;
      labelMarker._entranceName = name;
      entranceLabelsLayer.addLayer(labelMarker);
    });

    // نضيف طبقة الأسماء فورًا، ثم تتحكم دالة الظهور بها حسب مستوى التكبير.
    if (!map.hasLayer(entranceLabelsLayer)) {
      entranceLabelsLayer.addTo(map);
    }

    updateEntranceLabelGeometry();
    updateEntranceLabelsVisibility();
  }

  function updateEntranceLabelsVisibility() {
    // تظهر أسماء المداخل من مستوى 15، ثم تبقى متوافقة مع التكبير والتحريك.
    const showByZoom = map.getZoom() >= 15;
    const entrancesVisible =
      state.layers.entrances &&
      map.hasLayer(state.layers.entrances);

    if (!showByZoom || !entrancesVisible) {
      if (map.hasLayer(entranceLabelsLayer)) {
        map.removeLayer(entranceLabelsLayer);
      }
      return;
    }

    if (!map.hasLayer(entranceLabelsLayer)) {
      entranceLabelsLayer.addTo(map);
    }

    // بعد ظهور عناصر النص نعيد حساب موضعها وزاويتها حسب الشارع.
    requestAnimationFrame(updateEntranceLabelGeometry);
  }

  function clearSearchHighlight() {
    searchHighlightLayer.clearLayers();
    toast("تم إخفاء تحديد نتيجة البحث");
  }

  function highlightSearchTarget(item) {
    if (!item || !item.layer) return;

    searchHighlightLayer.clearLayers();

    const c = centroid(item.layer);

    // حلقة صفراء خفيفة حول موقع النتيجة.
    L.circleMarker(c, {
      radius: 17,
      color: "#facc15",
      weight: 4,
      fillColor: "#facc15",
      fillOpacity: 0.14,
      opacity: 0.95,
      className: "search-target-ring",
      pane: "facilitiesPane"
    }).addTo(searchHighlightLayer);

    // دبوس أصفر متحرك. الحركة على عنصر داخلي حتى لا تتعارض مع transform الخاص بـ Leaflet.
    L.marker(c, {
      interactive: false,
      keyboard: false,
      pane: "facilitiesPane",
      icon: L.divIcon({
        className: "search-target-pin-icon",
        html: `
          <div class="search-target-pin-bounce" aria-hidden="true">
            <span class="search-target-pin-shape"></span>
            <span class="search-target-pin-shadow"></span>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 40]
      })
    }).addTo(searchHighlightLayer);

  }

  async function loadLayer(type) {
    const response = await fetch(files[type]);
    if (!response.ok) throw new Error(`${type}: HTTP ${response.status}`);
    const data = await response.json();
    (data.features || []).forEach(feature => normalizeFeatureProperties(type, feature));
    state.data[type] = data;

const paneByType = {
  buildings: "buildingsPane",
  roads: "roadsPane",
  yellowLine: "yellowLinePane",
  neighborhoods: "neighborhoodsPane",
  municipalFacilities: "facilitiesPane",
  publicFacilities: "facilitiesPane",
  entrances: "entrancesPane"
};

    const options = {
      pane: paneByType[type],
      style: styles[type],
      pointToLayer: (feature, latlng) => {
        if (type === "entrances") {
          return entrancePoint(feature, latlng);
        }

        if (type === "municipalFacilities" || type === "publicFacilities") {
          return facilityPoint(type, latlng);
        }

        return L.circleMarker(latlng, {
          radius: 4,
          color: "#111827",
          weight: 1,
          fillColor: "#ffffff",
          fillOpacity: 1,
          pane: paneByType[type]
        });
      },
      onEachFeature: (f,l) => wireFeature(type,f,l)
    };
    const layer = L.geoJSON(data, options);
    state.layers[type] = layer;

    layer.addTo(map);

    if (type === "neighborhoods") {
      addNeighborhoodLabels(layer);
    }

    if (type === "municipalFacilities" || type === "publicFacilities") {
      addFacilityLabels(type, layer);
    }

    if (type === "entrances") {
      addEntranceLabels(layer);
    }

    // تثبيت ترتيب مجموعات البيانات بعد تحميلها.
    if (type === "neighborhoods" && layer.bringToBack) {
      layer.bringToBack();
    }

    if (type === "buildings" && layer.bringToFront) {
      layer.bringToFront();
    }

    layer.eachLayer(l => {
      const p = l.feature.properties || {};
      state.indexes.push({
        type, layer:l, feature:l.feature,
        title:titleFor(type,p),
        meta:subtitleFor(type,p),
        searchable:Object.values(p).filter(v=>v!==null).join(" ").toLowerCase()
      });
    });
  }

  async function boot() {
    try {
      await Promise.all(Object.keys(files).map(loadLayer));

      const mainMapLayers = [
        state.layers.neighborhoods,
        state.layers.buildings,
        state.layers.roads,
        state.layers.municipalFacilities,
        state.layers.publicFacilities,
        state.layers.entrances
      ].filter(Boolean);

      const allBounds = L.featureGroup(mainMapLayers).getBounds();

      if (allBounds.isValid()) {
        // لا ندخل الخط الأصفر في حدود العرض الابتدائي حتى لا يبعد الخريطة عن المغازي.
        const lockedBounds = allBounds.pad(0.12);
        map.setMaxBounds(lockedBounds);
        map.fitBounds(allBounds, { padding:[35,35], maxZoom:16 });
        map.panInsideBounds(lockedBounds, { animate:false });
      }

      updateCounts();
      compactStatisticsCards();
      buildNeighborhoodFilter();
      bindControls();

      // fitBounds قد يغيّر مستوى التكبير قبل ربط حدث zoomend،
      // لذلك نعيد إظهار أسماء المداخل وحساب موضعها بعد اكتمال العرض.
      const refreshEntranceLabels = () => {
        updateEntranceLabelsVisibility();
        updateEntranceLabelGeometry();
      };

      map.whenReady(refreshEntranceLabels);
      requestAnimationFrame(refreshEntranceLabels);
      setTimeout(refreshEntranceLabels, 120);
      setTimeout(refreshEntranceLabels, 450);

      restoreFromUrl();
      toast("تم تحميل جميع الطبقات بنجاح");
    } catch (error) {
      console.error(error);
      toast("تعذر تحميل بعض بيانات الخريطة");
    }
  }

  function updateCounts() {
    const b = state.data.buildings?.features.length || 0;
    const n = state.data.neighborhoods?.features.length || 0;
    const r = state.data.roads?.features.length || 0;
    const mf = state.data.municipalFacilities?.features.length || 0;
    const pf = state.data.publicFacilities?.features.length || 0;

    [["statBuildings",b],["statNeighborhoods",n],["statRoads",r],
     ["statMunicipalFacilities",mf],["statPublicFacilities",pf],
     ["compactStatBuildings",b],["compactStatNeighborhoods",n],["compactStatRoads",r],
     ["compactStatMunicipalFacilities",mf],["compactStatPublicFacilities",pf],
     ["countBuildings",b],["countNeighborhoods",n],["countRoads",r],
     ["countMunicipalFacilities",mf],["countPublicFacilities",pf]]
      .forEach(([id,val]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = Number(val).toLocaleString("en-US");
      });
  }

  function buildNeighborhoodFilter() {
    const select = document.getElementById("neighborhoodFilter");
    const names = (state.data.neighborhoods?.features || []).map(f => f.properties?.["اسم_الحي"]).filter(Boolean).sort();
    names.forEach(name => {
      const option = document.createElement("option");
      option.value = name; option.textContent = name; select.appendChild(option);
    });
  }

  function updateLayerClickPriority() {
    const neighborhoodsPane = map.getPane("neighborhoodsPane");
    const buildingsVisible = state.layers.buildings && map.hasLayer(state.layers.buildings);

    if (!neighborhoodsPane) return;

    // عند التكبير العام يمكن الضغط على الأحياء بسهولة.
    // عند الاقتراب وظهور المباني، تعطى الأولوية للمبنى حتى لا يفتح الحي بدلًا منه.
    neighborhoodsPane.style.pointerEvents =
      buildingsVisible && map.getZoom() >= 17 ? "none" : "auto";
  }

  function bindControls() {
    const toggles = {
      toggleBuildings: "buildings",
      toggleNeighborhoods: "neighborhoods",
      toggleRoads: "roads",
      toggleYellowLine: "yellowLine",
      toggleMunicipalFacilities: "municipalFacilities",
      togglePublicFacilities: "publicFacilities",
      toggleEntrances: "entrances"
    };

    Object.entries(toggles).forEach(([id, type]) => {
      const toggle = document.getElementById(id);
      if (!toggle || !state.layers[type]) return;

      toggle.addEventListener("change", event => {
        event.target.checked
          ? map.addLayer(state.layers[type])
          : map.removeLayer(state.layers[type]);

        if (type === "municipalFacilities" || type === "publicFacilities") {
          updateFacilityLabelsVisibility();
        }

        if (type === "entrances") {
          updateEntranceLabelsVisibility();
        }

        updateLayerClickPriority();
      });
    });

    document.querySelectorAll(".section-toggle").forEach(btn => btn.addEventListener("click", () => {
      const body = btn.nextElementSibling;
      body.classList.toggle("collapsed");
      btn.classList.toggle("open");
    }));

    document.getElementById("sidebarBtn").addEventListener("click", () => document.getElementById("sidebar").classList.add("open"));
    document.getElementById("closeSidebarBtn").addEventListener("click", () => document.getElementById("sidebar").classList.remove("open"));
    document.getElementById("closeDetailsBtn").addEventListener("click", closeDetails);

    document.getElementById("homeBtn").addEventListener("click", () => {
      const mainMapLayers = [
        state.layers.neighborhoods,
        state.layers.buildings,
        state.layers.roads,
        state.layers.municipalFacilities,
        state.layers.publicFacilities,
        state.layers.entrances
      ].filter(Boolean);

      const bounds = L.featureGroup(mainMapLayers).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding:[30,30], maxZoom:16 });
      }
    });

  let userLocationMarker = null;
let userAccuracyCircle = null;

/* فحص هل النقطة داخل حدود مضلع */
function pointInsideRing(lat, lng, ring) {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];

    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/* دعم Polygon وMultiPolygon */
function pointInsideGeometry(lat, lng, geometry) {
  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    return pointInsideRing(lat, lng, geometry.coordinates[0]);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some(polygon =>
      pointInsideRing(lat, lng, polygon[0])
    );
  }

  return false;
}

/* معرفة اسم الحي الذي توجد داخله النقطة */
function findCurrentNeighborhood(lat, lng) {
  const neighborhoods =
    state.data.neighborhoods?.features || [];

  return neighborhoods.find(feature =>
    pointInsideGeometry(lat, lng, feature.geometry)
  );
}

/* إيجاد طبقة الحي على الخريطة */
function findNeighborhoodLayer(feature) {
  let foundLayer = null;

  state.layers.neighborhoods?.eachLayer(layer => {
    if (layer.feature === feature) {
      foundLayer = layer;
    }
  });

  return foundLayer;
}

/* عند الضغط على زر موقعي */
document
  .getElementById("locateBtn")
  .addEventListener("click", function () {
    toast("جارٍ تحديد موقعك...");

    map.locate({
      setView: false,
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    });
  });

/* عند نجاح تحديد الموقع */
map.on("locationfound", function (event) {
  const lat = event.latlng.lat;
  const lng = event.latlng.lng;
  const accuracy = Math.round(event.accuracy);

  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }

  if (userAccuracyCircle) {
    map.removeLayer(userAccuracyCircle);
  }

  const neighborhoodFeature =
    findCurrentNeighborhood(lat, lng);

  const properties =
    neighborhoodFeature?.properties || {};

  const neighborhoodName =
    properties["اسم_الحي"] ||
    properties["الاسم"] ||
    "خارج حدود الأحياء المسجلة";

  userAccuracyCircle = L.circle(event.latlng, {
    radius: event.accuracy,
    color: "#2563eb",
    weight: 2,
    fillColor: "#2563eb",
    fillOpacity: 0.08
  }).addTo(map);

  userLocationMarker = L.circleMarker(event.latlng, {
    radius: 9,
    color: "#ffffff",
    weight: 3,
    fillColor: "#e63946",
    fillOpacity: 1
  })
    .addTo(map)
    .bindPopup(`
      <div dir="rtl" style="text-align:right">
        <strong>موقعك الحالي</strong><br>
        الحي: ${escapeHtml(neighborhoodName)}<br>
        دقة الموقع: حوالي ${accuracy} متر
      </div>
    `)
    .openPopup();

  map.setView(event.latlng, 18);

  /* جعل زر Google Maps يفتح موقعك الحقيقي */
  const googleMapsBtn =
    document.getElementById("googleMapsBtn");

  if (googleMapsBtn) {
    googleMapsBtn.href =
      `https://www.google.com/maps?q=${lat},${lng}`;
  }

  /*
   * إذا كانت شاشة أقرب خدمة مفتوحة، لا نستبدل معلومات أقرب معلم
   * بمعلومات الحي. يكفي تحديث موقع المستخدم، ثم تعيد أداة أقرب خدمة
   * الحساب وتفتح معلومات أقرب نتيجة في اللوحة المقابلة.
   */
  const nearestPanelIsOpen = Boolean(
    document.querySelector(".public-nearest-panel")
  );

  if (nearestPanelIsOpen) {
    publicLastUserLatLng = event.latlng;
    toast(`تم تحديد موقعك داخل حي ${neighborhoodName}`);
    return;
  }

  /* فتح تفاصيل الحي عند استخدام زر موقعي العادي فقط */
  if (neighborhoodFeature) {
    const neighborhoodLayer =
      findNeighborhoodLayer(neighborhoodFeature);

    if (neighborhoodLayer) {
      showDetails(
        "neighborhoods",
        neighborhoodFeature,
        neighborhoodLayer
      );

      /* نعيد زر Google Maps لموقع المستخدم بعد فتح التفاصيل */
      document.getElementById("googleMapsBtn").href =
        `https://www.google.com/maps?q=${lat},${lng}`;
    }

    toast(`موقعك داخل حي ${neighborhoodName}`);
  } else {
    toast("موقعك خارج حدود الأحياء الموجودة في البيانات");
  }
});

/* عند فشل تحديد الموقع */
map.on("locationerror", function (error) {
  console.error(error);

  if (error.code === 1) {
    toast("اسمحي للموقع بالوصول إلى GPS من المتصفح");
  } else if (error.code === 2) {
    toast("تعذر معرفة موقعك، فعّلي خدمة الموقع");
  } else {
    toast("استغرق تحديد الموقع وقتًا طويلًا");
  }
});

    document.getElementById("basemapBtn").addEventListener("click", () => document.getElementById("basemapMenu").classList.toggle("open"));

    // جعل زر الأقمار الصناعية هو النشط عند فتح الصفحة.
    document.querySelectorAll("#basemapMenu button").forEach(button => {
      button.classList.toggle("active", button.dataset.map === "satellite");
    });

    document.querySelectorAll("#basemapMenu button").forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll("#basemapMenu button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      if (btn.dataset.map === "satellite") { map.removeLayer(street); satellite.addTo(map); }
      else { map.removeLayer(satellite); street.addTo(map); }
      document.getElementById("basemapMenu").classList.remove("open");
    }));

    document.getElementById("themeBtn").addEventListener("click", () => {
      document.body.classList.toggle("dark");
      document.querySelector("#themeBtn i").className = document.body.classList.contains("dark") ? "fa-solid fa-sun" : "fa-solid fa-moon";
    });

    document.getElementById("fullscreenBtn").addEventListener("click", async () => {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    });

    // طبقة مستقلة لحفظ خطوط ومساحات القياس.
    const measurementLayers = L.layerGroup().addTo(map);

    const distanceBtn = document.getElementById("measureDistanceBtn");
    const areaBtn = document.getElementById("measureAreaBtn");

    function stopMeasurement() {
      map.pm.disableDraw();
    }

    function calculatePolygonArea(latlngs) {
      if (!latlngs || latlngs.length < 3) return 0;

      const earthRadius = 6378137;
      let area = 0;

      for (let i = 0; i < latlngs.length; i++) {
        const current = latlngs[i];
        const next = latlngs[(i + 1) % latlngs.length];
        const longitudeDifference = (next.lng - current.lng) * Math.PI / 180;

        area += longitudeDifference * (
          2 +
          Math.sin(current.lat * Math.PI / 180) +
          Math.sin(next.lat * Math.PI / 180)
        );
      }

      return Math.abs(area * earthRadius * earthRadius / 2);
    }

    if (distanceBtn) {
      distanceBtn.addEventListener("click", () => {
        stopMeasurement();

        map.pm.enableDraw("Line", {
          snappable: true,
          finishOn: "dblclick",
          pathOptions: {
            color: "#2563eb",
            weight: 4
          }
        });

        toast("حدد النقاط ثم اضغطي مرتين بسرعة لإنهاء قياس المسافة");
      });
    }

    if (areaBtn) {
      areaBtn.addEventListener("click", () => {
        stopMeasurement();

        map.pm.enableDraw("Polygon", {
          snappable: true,
          finishOn: "dblclick",
          pathOptions: {
            color: "#7c3aed",
            weight: 3,
            fillColor: "#7c3aed",
            fillOpacity: 0.22
          }
        });

        toast("ارسم حدود المنطقة ثم اضغطي مرتين بسرعة لإنهاء قياس المساحة");
      });
    }

    map.on("pm:create", event => {
      stopMeasurement();

      const layer = event.layer;
      measurementLayers.addLayer(layer);

      if (event.shape === "Line") {
        const points = layer.getLatLngs();
        let distance = 0;

        for (let i = 1; i < points.length; i++) {
          distance += points[i - 1].distanceTo(points[i]);
        }

        const distanceText = distance >= 1000
          ? `${(distance / 1000).toFixed(2)} كم`
          : `${distance.toFixed(1)} متر`;

        layer.bindTooltip(
          `<strong>المسافة: ${distanceText}</strong>`,
          {
            permanent: true,
            direction: "center",
            className: "measurement-tooltip"
          }
        ).openTooltip();

        toast(`المسافة: ${distanceText}`);
      }

      if (event.shape === "Polygon") {
        const points = layer.getLatLngs()[0];
        const area = calculatePolygonArea(points);

        const areaText = area >= 1000000
          ? `${(area / 1000000).toFixed(2)} كم²`
          : `${area.toLocaleString("ar-EG", { maximumFractionDigits: 1 })} م²`;

        layer.bindTooltip(
          `<strong>المساحة: ${areaText}</strong>`,
          {
            permanent: true,
            direction: "center",
            className: "measurement-tooltip"
          }
        ).openTooltip();

        toast(`المساحة: ${areaText}`);
      }
    });

    // إنشاء زر حذف القياسات تلقائيًا داخل شريط الأدوات.
    let clearMeasurementsBtn = document.getElementById("clearMeasurementsBtn");

    if (!clearMeasurementsBtn) {
      const toolbar = document.querySelector(".map-toolbar");

      if (toolbar) {
        clearMeasurementsBtn = document.createElement("button");
        clearMeasurementsBtn.id = "clearMeasurementsBtn";
        clearMeasurementsBtn.type = "button";
        clearMeasurementsBtn.title = "حذف خطوط ومساحات القياس";
        clearMeasurementsBtn.setAttribute("aria-label", "حذف خطوط ومساحات القياس");
        clearMeasurementsBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        toolbar.appendChild(clearMeasurementsBtn);
      }
    }

    if (clearMeasurementsBtn) {
      clearMeasurementsBtn.addEventListener("click", () => {
        stopMeasurement();
        measurementLayers.clearLayers();
        toast("تم حذف جميع خطوط ومساحات القياس");
      });
    }

    document.getElementById("printBtn").addEventListener("click", () => window.print());
    document.getElementById("printDetailsBtn").addEventListener("click", () => window.print());
    document.getElementById("copyCoordsBtn").addEventListener("click", copyCoords);
    document.getElementById("shareBtn").addEventListener("click", shareCurrent);

    document.getElementById("applyFiltersBtn").addEventListener("click", applyFilters);
    document.getElementById("resetFiltersBtn").addEventListener("click", resetFilters);

    setupSearch();
    ensurePublicMapTools();

    map.on("mousemove", e => document.getElementById("coordWgs").textContent = `${e.latlng.lat.toFixed(5)} N, ${e.latlng.lng.toFixed(5)} E`);
    map.on("zoomend", () => {
      document.getElementById("zoomLevel").textContent = `Zoom ${map.getZoom()}`;
      updateLayerClickPriority();
      updateFacilityLabelsVisibility();
      updateEntranceLabelsVisibility();
      updateEntranceLabelGeometry();
    });

    map.on("moveend", () => {
      updateFacilityLabelsVisibility();
      updateEntranceLabelGeometry();
    });

    map.on("layeradd layerremove", event => {
      if (event.layer === state.layers.entrances) {
        updateEntranceLabelsVisibility();
        requestAnimationFrame(updateEntranceLabelGeometry);
      }
    });

    updateLayerClickPriority();
    updateFacilityLabelsVisibility();
  }

  function setupSearch() {
    const input=document.getElementById("searchInput"), results=document.getElementById("searchResults");
    input.addEventListener("input", () => {
      const q=input.value.trim().toLowerCase();
      if(!q){results.classList.remove("open");results.innerHTML="";return;}
      const found=state.indexes.filter(x=>x.searchable.includes(q)||x.title.toLowerCase().includes(q)).slice(0,15);
      results.innerHTML=found.length?found.map((x,i)=>`<div class="result-item" data-i="${i}"><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.meta)}</span></div>`).join(""):`<div class="result-item"><span>لا توجد نتائج</span></div>`;
      results.classList.add("open");
      results.querySelectorAll("[data-i]").forEach(el=>el.addEventListener("click",()=>focusItem(found[+el.dataset.i])));
    });
    document.getElementById("searchClear").addEventListener("click",()=>{input.value="";results.classList.remove("open");searchHighlightLayer.clearLayers();});
    document.addEventListener("click",e=>{if(!e.target.closest(".global-search"))results.classList.remove("open");});
  }

  function focusItem(item) {
    const layer = item.layer;

    if (layer.getBounds) {
      map.fitBounds(layer.getBounds(), {
        maxZoom: 19,
        padding: [80, 80]
      });
    } else {
      map.setView(layer.getLatLng(), 18);
    }

    highlightSearchTarget(item);
    layer.fire("click");

    document.getElementById("searchResults").classList.remove("open");
    toast(`تم تحديد: ${item.title}`);
  }

  function applyFilters() {
    const bn=document.getElementById("buildingNumberFilter")
    .value.trim();
    const sn=document.getElementById("streetNumberFilter").value.trim();
    const neighborhood=document.getElementById("neighborhoodFilter").value;
    let matches=state.indexes.filter(x=>{
      const p=x.feature.properties||{};
      if(bn && String(p["رقم_المبنى"]??"")!==bn) return false;
      if(sn && String(p["رقم_الشارع"]??"")!==sn) return false;
      if(neighborhood && x.type==="neighborhoods" && p["اسم_الحي"]!==neighborhood) return false;
      return bn||sn||neighborhood;
    });
    if(matches.length){focusItem(matches[0]);toast(`تم العثور على ${matches.length} نتيجة`);}
    else toast("لا توجد نتائج مطابقة");
  }

  function resetFilters() {
    document.getElementById("buildingNumberFilter").value="";
    document.getElementById("streetNumberFilter").value="";
    document.getElementById("neighborhoodFilter").value="";
    toast("تمت إعادة ضبط الفلاتر");
  }

  function closeDetails() {
    document.getElementById("detailsPanel").classList.remove("open");

    // عند إغلاق التفاصيل يرجع العنصر المحدد إلى لونه الطبيعي.
    if (
      state.selected?.layer &&
      state.selected.layer.setStyle &&
      styles[state.selected.type]
    ) {
      state.selected.layer.setStyle(styles[state.selected.type]);
    }

    state.selected = null;
    const url = new URL(location.href);
    url.searchParams.delete("type");
    url.searchParams.delete("id");
    history.replaceState(null, "", url);
  }

  async function copyCoords() {
    if(!state.selected)return;
    const text=`${state.selected.latlng.lat.toFixed(6)}, ${state.selected.latlng.lng.toFixed(6)}`;
    await navigator.clipboard.writeText(text);toast("تم نسخ الإحداثيات");
  }

  async function shareCurrent() {
    if(!state.selected)return;
    const data={title:document.getElementById("detailTitle").textContent,text:"موقع على بوابة المغازي الجغرافية",url:location.href};
    if(navigator.share) await navigator.share(data);
    else {await navigator.clipboard.writeText(location.href);toast("تم نسخ رابط المشاركة");}
  }

  function restoreFromUrl() {
    const params=new URLSearchParams(location.search),type=params.get("type"),id=params.get("id");
    if(!type||!id)return;
    const item=state.indexes.find(x=>{
      if(x.type!==type)return false;
      const p=x.feature.properties||{};
      return String(
        p["معرف_المبنى"] ||
        p["اسم_الحي"] ||
        p["اسم_الشارع"] ||
        p["اسم_المرفق"] ||
        p["اسم_المدخل"] ||
        p["اسم_الخط"] ||
        ""
      ) === id;
    });
    if(item) focusItem(item);
  }

  function toast(message) {
    const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");
    clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2200);
  }



  /* =========================================================
     أدوات المواطن في الشريط العلوي بجانب زر الوضع الليلي
     - استكشف مخيم المغازي
     - أقرب خدمة إليك
     - إرسال بلاغ من هنا
     ========================================================= */
  let publicMapToolsReady = false;
  let publicToolsMenuOpen = false;
  let publicLastUserLatLng = null;
  let publicActiveNearestCategory = null;
  let publicNearestLine = null;
  let publicNearestResultsLayer = null;
  let publicReportPickMode = false;
  let publicTourTimer = null;
  let publicReportMarker = null;

  const publicToolsStyle = document.createElement("style");
  publicToolsStyle.textContent = `
    .public-map-tools-wrapper {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
      flex: 0 0 auto !important;
      overflow: visible !important;
      z-index: 9999 !important;
    }

    .public-map-tools-button {
      width: 54px !important;
      height: 54px !important;
      min-width: 54px !important;
      padding: 0 !important;
      margin: 0 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 14px !important;
      border: 1px solid rgba(255,255,255,.28) !important;
      background: rgba(255,255,255,.08) !important;
      color: #fff !important;
      box-shadow: none !important;
      cursor: pointer !important;
      font-size: 21px !important;
      transition: transform .18s ease, background .18s ease !important;
    }

    .public-map-tools-button:hover,
    .public-map-tools-button.active {
      background: rgba(255,255,255,.18) !important;
      transform: translateY(-1px) !important;
    }

    .public-map-tools-menu {
      position: absolute !important;
      left: 0 !important;
      top: calc(100% + 12px) !important;
      bottom: auto !important;
      width: 250px !important;
      padding: 8px !important;
      display: none !important;
      flex-direction: column !important;
      gap: 8px !important;
      direction: rtl !important;
      background: rgba(255,255,255,.98) !important;
      border: 1px solid rgba(15,49,85,.14) !important;
      border-radius: 18px !important;
      box-shadow: 0 14px 34px rgba(15,23,42,.25) !important;
      z-index: 10000 !important;
      backdrop-filter: blur(10px) !important;
    }

    .public-map-tools-menu.open {
      display: flex !important;
    }

    .public-map-tools-menu::after {
      content: "";
      position: absolute;
      left: 18px;
      top: -7px;
      width: 14px;
      height: 14px;
      background: #fff;
      border-left: 1px solid rgba(15,49,85,.14);
      border-top: 1px solid rgba(15,49,85,.14);
      transform: rotate(45deg);
    }

    .public-map-tools-menu button {
      width: 100% !important;
      min-height: 48px !important;
      padding: 10px 13px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 11px !important;
      border: 0 !important;
      border-radius: 12px !important;
      background: #f7f8fa !important;
      color: #0f3155 !important;
      font-family: "Tajawal", "Cairo", Arial, sans-serif !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      text-align: right !important;
      cursor: pointer !important;
      transition: background .18s ease, transform .18s ease !important;
    }

    .public-map-tools-menu button:hover,
    .public-map-tools-menu button.active {
      background: #f1e8e8 !important;
      color: #8f1d1d !important;
      transform: translateX(-2px) !important;
    }

    .public-map-tools-menu button i {
      width: 22px !important;
      color: #8f1d1d !important;
      font-size: 17px !important;
      text-align: center !important;
    }

    .public-tools-panel,
    .public-report-panel,
    .public-tour-card {
      position: absolute !important;
      left: 18px !important;
      bottom: 84px !important;
      width: min(340px, calc(100% - 36px)) !important;
      direction: rtl !important;
      z-index: 10020 !important;
      padding: 16px !important;
      border-radius: 18px !important;
      background: rgba(255,255,255,.98) !important;
      border: 1px solid rgba(15,49,85,.14) !important;
      box-shadow: 0 16px 38px rgba(15,23,42,.28) !important;
      font-family: "Tajawal", "Cairo", Arial, sans-serif !important;
    }

    .public-tools-panel h3,
    .public-report-panel h3,
    .public-tour-card h3 {
      margin: 0 0 8px !important;
      color: #0f3155 !important;
      font-size: 18px !important;
      font-weight: 900 !important;
    }

    .public-tools-panel p,
    .public-report-panel p,
    .public-tour-card p {
      margin: 0 0 12px !important;
      color: #526173 !important;
      font-size: 13px !important;
      line-height: 1.65 !important;
    }

    .public-tools-actions {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0,1fr)) !important;
      gap: 8px !important;
    }

    .public-tools-actions button,
    .public-tools-actions a {
      min-height: 42px !important;
      padding: 9px 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 7px !important;
      border: 0 !important;
      border-radius: 10px !important;
      background: #edf2f7 !important;
      color: #0f3155 !important;
      font: 800 13px "Tajawal", "Cairo", Arial, sans-serif !important;
      text-decoration: none !important;
      cursor: pointer !important;
    }

    .public-tools-actions .primary {
      background: #0f3155 !important;
      color: #fff !important;
    }

    .public-tools-actions .danger {
      background: #8f1d1d !important;
      color: #fff !important;
    }

    .public-report-panel input,
    .public-report-panel select,
    .public-report-panel textarea {
      width: 100% !important;
      box-sizing: border-box !important;
      margin-bottom: 9px !important;
      padding: 10px 11px !important;
      border: 1px solid #d7dee7 !important;
      border-radius: 10px !important;
      background: #fff !important;
      color: #172536 !important;
      font: 700 13px "Tajawal", "Cairo", Arial, sans-serif !important;
    }

    .public-report-panel textarea {
      min-height: 82px !important;
      resize: vertical !important;
    }

    .public-tour-progress {
      height: 6px !important;
      overflow: hidden !important;
      border-radius: 999px !important;
      background: #e4e8ee !important;
    }

    .public-tour-progress span {
      display: block !important;
      height: 100% !important;
      border-radius: inherit !important;
      background: #8f1d1d !important;
      transition: width .3s ease !important;
    }

    .public-nearest-results-list {
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
      margin-top: 10px !important;
      max-height: 180px !important;
      overflow-y: auto !important;
    }

    .public-nearest-result-item {
      width: 100% !important;
      min-height: 38px !important;
      padding: 7px 9px !important;
      display: grid !important;
      grid-template-columns: 1fr auto !important;
      align-items: center !important;
      gap: 8px !important;
      border: 1px solid #dce5ef !important;
      border-radius: 9px !important;
      background: #ffffff !important;
      color: #17324f !important;
      font: 800 12px "Tajawal", "Cairo", Arial, sans-serif !important;
      cursor: pointer !important;
      text-align: right !important;
    }

    .public-nearest-result-item:first-child {
      border-color: #2563eb !important;
      background: #eef5ff !important;
    }

    .public-nearest-result-number {
      width: 24px !important;
      height: 24px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 50% !important;
      background: #0f3155 !important;
      color: #fff !important;
      font-size: 11px !important;
    }

    .public-nearest-result-distance {
      direction: ltr !important;
      color: #64748b !important;
      white-space: nowrap !important;
      font-size: 11px !important;
    }

    .public-nearest-map-number {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #0f3155;
      color: #fff;
      border: 2px solid #fff;
      box-shadow: 0 2px 7px rgba(15,23,42,.45);
      font: 900 12px "Tajawal", Arial, sans-serif;
    }

    .public-nearest-map-number.nearest {
      width: 32px;
      height: 32px;
      background: #2563eb;
      box-shadow: 0 0 0 5px rgba(37,99,235,.22), 0 3px 9px rgba(15,23,42,.5);
    }

    .public-nearest-result-number,
    .public-nearest-map-number,
    .public-nearest-number-icon {
      display: none !important;
    }

    .public-nearest-tooltip {
      direction: rtl;
      font-family: "Tajawal", Arial, sans-serif;
      font-size: 11px;
      font-weight: 800;
    }

    .public-nearest-service-label {
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      pointer-events: none !important;
      overflow: visible !important;
    }

    .public-nearest-service-label span {
      display: inline-block !important;
      max-width: 165px !important;
      padding: 4px 8px !important;
      border-radius: 9px !important;
      background: rgba(255,255,255,.97) !important;
      color: #17324f !important;
      border: 1px solid rgba(15,49,85,.20) !important;
      box-shadow: 0 2px 7px rgba(15,23,42,.22) !important;
      font: 900 11px "Tajawal", "Cairo", Arial, sans-serif !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      text-align: center !important;
      direction: rtl !important;
    }

    /* عند فتح أقرب خدمة: لوحة الخدمة يسار، ومعلومات العنصر يمين */
    .map-area.public-nearest-layout .public-nearest-panel {
      left: 18px !important;
      right: auto !important;
      bottom: 84px !important;
      width: min(340px, calc(50% - 42px)) !important;
      max-height: calc(100% - 120px) !important;
      overflow-y: auto !important;
      z-index: 10020 !important;
    }

    .map-area.public-nearest-layout #detailsPanel {
      position: absolute !important;
      left: auto !important;
      right: 18px !important;
      top: auto !important;
      bottom: 84px !important;
      width: min(340px, calc(50% - 42px)) !important;
      max-width: 340px !important;
      max-height: calc(100% - 120px) !important;
      overflow-y: auto !important;
      z-index: 10021 !important;
    }

    @media (max-width: 900px) {
      .map-area.public-nearest-layout .public-nearest-panel {
        left: 10px !important;
        right: 10px !important;
        bottom: 10px !important;
        width: auto !important;
        max-height: 43% !important;
      }

      .map-area.public-nearest-layout #detailsPanel {
        left: 10px !important;
        right: 10px !important;
        top: 72px !important;
        bottom: auto !important;
        width: auto !important;
        max-width: none !important;
        max-height: 40% !important;
      }
    }

    @media (max-width: 700px) {
      .public-map-tools-button {
        width: 48px !important;
        height: 48px !important;
        min-width: 48px !important;
        border-radius: 12px !important;
      }

      .public-map-tools-menu {
        width: 225px !important;
        left: 0 !important;
        right: auto !important;
      }

      .public-tools-panel,
      .public-report-panel,
      .public-tour-card {
        left: 10px !important;
        bottom: 72px !important;
        width: calc(100% - 20px) !important;
      }
    }
  `;
  document.head.appendChild(publicToolsStyle);

  function closePublicToolsMenu() {
    publicToolsMenuOpen = false;
    document.getElementById("publicMapToolsMenu")?.classList.remove("open");
    document.getElementById("publicMapToolsButton")?.classList.remove("active");
  }

  function closeMapInformationForPublicTools() {
    const detailsPanel = document.getElementById("detailsPanel");
    if (detailsPanel) detailsPanel.classList.remove("open");

    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");

    if (
      state.selected?.layer &&
      state.selected.layer.setStyle &&
      styles[state.selected.type]
    ) {
      state.selected.layer.setStyle(styles[state.selected.type]);
    }

    state.selected = null;

    const url = new URL(location.href);
    url.searchParams.delete("type");
    url.searchParams.delete("id");
    history.replaceState(null, "", url);
  }


  function resetSeparatedPanelsLayout() {
    document.body.classList.remove("public-nearest-layout");

    const detailsPanel = document.getElementById("detailsPanel");
    if (detailsPanel) {
      [
        "position", "left", "right", "top", "bottom", "width", "max-width",
        "height", "max-height", "overflow-y", "z-index", "transform",
        "opacity", "visibility", "display"
      ].forEach(property => detailsPanel.style.removeProperty(property));
    }
  }

  function applySeparatedPanelsLayout() {
    const nearestPanel = document.querySelector(".public-nearest-panel");
    const detailsPanel = document.getElementById("detailsPanel");
    const mapArea = document.querySelector(".map-area") || document.getElementById("map");

    if (!nearestPanel || !mapArea) return;

    document.body.classList.add("public-nearest-layout");

    const mapRect = mapArea.getBoundingClientRect();
    const gap = 16;
    const topGap = 16;

    if (window.innerWidth > 900) {
      const panelWidth = Math.min(360, Math.max(300, (mapRect.width - gap * 3) / 2));
      const panelHeight = Math.max(260, mapRect.height - topGap * 2);

      nearestPanel.style.setProperty("position", "fixed", "important");
      nearestPanel.style.setProperty("left", `${Math.max(gap, mapRect.left + gap)}px`, "important");
      nearestPanel.style.setProperty("right", "auto", "important");
      nearestPanel.style.setProperty("top", `${Math.max(gap, mapRect.top + topGap)}px`, "important");
      nearestPanel.style.setProperty("bottom", "auto", "important");
      nearestPanel.style.setProperty("width", `${panelWidth}px`, "important");
      nearestPanel.style.setProperty("max-height", `${panelHeight}px`, "important");
      nearestPanel.style.setProperty("overflow-y", "auto", "important");
      nearestPanel.style.setProperty("z-index", "10020", "important");

      if (detailsPanel?.classList.contains("open")) {
        detailsPanel.style.setProperty("position", "fixed", "important");
        detailsPanel.style.setProperty("left", "auto", "important");
        detailsPanel.style.setProperty("right", `${Math.max(gap, window.innerWidth - mapRect.right + gap)}px`, "important");
        detailsPanel.style.setProperty("top", `${Math.max(gap, mapRect.top + topGap)}px`, "important");
        detailsPanel.style.setProperty("bottom", "auto", "important");
        detailsPanel.style.setProperty("width", `${panelWidth}px`, "important");
        detailsPanel.style.setProperty("max-width", `${panelWidth}px`, "important");
        detailsPanel.style.setProperty("max-height", `${panelHeight}px`, "important");
        detailsPanel.style.setProperty("overflow-y", "auto", "important");
        detailsPanel.style.setProperty("z-index", "10021", "important");
        detailsPanel.style.setProperty("transform", "none", "important");
        detailsPanel.style.setProperty("opacity", "1", "important");
        detailsPanel.style.setProperty("visibility", "visible", "important");
      }
    } else {
      const horizontalGap = 10;
      const usableWidth = Math.max(280, mapRect.width - horizontalGap * 2);

      nearestPanel.style.setProperty("position", "fixed", "important");
      nearestPanel.style.setProperty("left", `${Math.max(horizontalGap, mapRect.left + horizontalGap)}px`, "important");
      nearestPanel.style.setProperty("right", "auto", "important");
      nearestPanel.style.setProperty("top", `${Math.max(horizontalGap, mapRect.top + mapRect.height * 0.50)}px`, "important");
      nearestPanel.style.setProperty("bottom", "auto", "important");
      nearestPanel.style.setProperty("width", `${usableWidth}px`, "important");
      nearestPanel.style.setProperty("max-height", `${Math.max(220, mapRect.height * 0.46)}px`, "important");
      nearestPanel.style.setProperty("overflow-y", "auto", "important");
      nearestPanel.style.setProperty("z-index", "10020", "important");

      if (detailsPanel?.classList.contains("open")) {
        detailsPanel.style.setProperty("position", "fixed", "important");
        detailsPanel.style.setProperty("left", `${Math.max(horizontalGap, mapRect.left + horizontalGap)}px`, "important");
        detailsPanel.style.setProperty("right", "auto", "important");
        detailsPanel.style.setProperty("top", `${Math.max(horizontalGap, mapRect.top + horizontalGap)}px`, "important");
        detailsPanel.style.setProperty("bottom", "auto", "important");
        detailsPanel.style.setProperty("width", `${usableWidth}px`, "important");
        detailsPanel.style.setProperty("max-width", `${usableWidth}px`, "important");
        detailsPanel.style.setProperty("max-height", `${Math.max(220, mapRect.height * 0.43)}px`, "important");
        detailsPanel.style.setProperty("overflow-y", "auto", "important");
        detailsPanel.style.setProperty("z-index", "10021", "important");
        detailsPanel.style.setProperty("transform", "none", "important");
        detailsPanel.style.setProperty("opacity", "1", "important");
        detailsPanel.style.setProperty("visibility", "visible", "important");
      }
    }
  }

  function closePublicToolPanels() {
    publicActiveNearestCategory = null;
    document.querySelectorAll(".public-tools-panel,.public-report-panel,.public-tour-card").forEach(el => el.remove());
    document.querySelector(".map-area")?.classList.remove("public-nearest-layout");
    resetSeparatedPanelsLayout();

    if (publicNearestResultsLayer && map.hasLayer(publicNearestResultsLayer)) {
      map.removeLayer(publicNearestResultsLayer);
    }
    publicNearestResultsLayer = null;
    publicNearestLine = null;

    if (publicTourTimer) {
      clearTimeout(publicTourTimer);
      publicTourTimer = null;
    }

    // إعادة أسماء المرافق الطبيعية بعد إغلاق شاشة أقرب خدمة.
    requestAnimationFrame(updateFacilityLabelsVisibility);
  }

  function ensurePublicMapTools() {
    if (publicMapToolsReady) return;

    const themeButton = document.getElementById("themeBtn");
    const topToolbar = themeButton?.parentElement;
    if (!themeButton || !topToolbar) return;

    // السماح للقائمة بالظهور خارج حدود الشريط العلوي.
    topToolbar.style.setProperty("overflow", "visible", "important");

    publicMapToolsReady = true;

    const wrapper = document.createElement("div");
    wrapper.className = "public-map-tools-wrapper";
    wrapper.innerHTML = `
      <button id="publicMapToolsButton" class="public-map-tools-button" type="button"
              title="أدوات الخريطة" aria-label="أدوات الخريطة" aria-expanded="false">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </button>

      <div id="publicMapToolsMenu" class="public-map-tools-menu">
        <button id="publicExploreButton" type="button">
          <i class="fa-solid fa-route"></i>
          <span>استكشف مخيم المغازي</span>
        </button>

        <button id="publicNearestButton" type="button">
          <i class="fa-solid fa-location-arrow"></i>
          <span>أقرب خدمة إليك</span>
        </button>

        <button id="publicReportButton" type="button">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>إرسال بلاغ من هنا</span>
        </button>
      </div>
    `;

    // وضع زر الأدوات مباشرة بجانب زر الوضع الليلي في الشريط العلوي.
    topToolbar.insertBefore(wrapper, themeButton);

    const toggleButton = wrapper.querySelector("#publicMapToolsButton");
    const menu = wrapper.querySelector("#publicMapToolsMenu");

    // جعل زر أدوات الخريطة بنفس حجم ومحاذاة زر الوضع الليلي تمامًا.
    const syncPublicToolsButtonSize = () => {
      const sourceRect = themeButton.getBoundingClientRect();
      const sourceStyle = getComputedStyle(themeButton);

      if (!sourceRect.width || !sourceRect.height) return;

      wrapper.style.setProperty("width", `${sourceRect.width}px`, "important");
      wrapper.style.setProperty("height", `${sourceRect.height}px`, "important");
      wrapper.style.setProperty("min-width", `${sourceRect.width}px`, "important");
      wrapper.style.setProperty("min-height", `${sourceRect.height}px`, "important");
      wrapper.style.setProperty("align-self", "center", "important");

      toggleButton.style.setProperty("width", `${sourceRect.width}px`, "important");
      toggleButton.style.setProperty("height", `${sourceRect.height}px`, "important");
      toggleButton.style.setProperty("min-width", `${sourceRect.width}px`, "important");
      toggleButton.style.setProperty("min-height", `${sourceRect.height}px`, "important");
      toggleButton.style.setProperty("max-width", `${sourceRect.width}px`, "important");
      toggleButton.style.setProperty("max-height", `${sourceRect.height}px`, "important");
      toggleButton.style.setProperty("padding", sourceStyle.padding, "important");
      toggleButton.style.setProperty("border-radius", sourceStyle.borderRadius, "important");
      toggleButton.style.setProperty("font-size", sourceStyle.fontSize, "important");
      toggleButton.style.setProperty("line-height", sourceStyle.lineHeight, "important");
      toggleButton.style.setProperty("margin", "0", "important");
      toggleButton.style.setProperty("vertical-align", "middle", "important");
    };

    syncPublicToolsButtonSize();
    requestAnimationFrame(syncPublicToolsButtonSize);
    window.addEventListener("resize", syncPublicToolsButtonSize);

    toggleButton.addEventListener("click", event => {
      event.stopPropagation();
      publicToolsMenuOpen = !publicToolsMenuOpen;
      menu.classList.toggle("open", publicToolsMenuOpen);
      toggleButton.classList.toggle("active", publicToolsMenuOpen);
      toggleButton.setAttribute("aria-expanded", String(publicToolsMenuOpen));
    });

    menu.addEventListener("click", event => event.stopPropagation());

    wrapper.querySelector("#publicExploreButton").addEventListener("click", () => {
      closePublicToolsMenu();
      startPublicExploreTour();
    });

    wrapper.querySelector("#publicNearestButton").addEventListener("click", () => {
      closePublicToolsMenu();
      openPublicNearestPanel();
    });

    wrapper.querySelector("#publicReportButton").addEventListener("click", () => {
      closePublicToolsMenu();
      startPublicReportPick();
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".public-map-tools-wrapper")) {
        closePublicToolsMenu();
      }
    });

    map.on("locationfound", event => {
      publicLastUserLatLng = event.latlng;

      // إذا اختارتِ فئة قبل تحديد الموقع، أعد حساب الأقرب فورًا
      // وافتح معلومات أقرب معلم في اللوحة المقابلة.
      if (
        publicActiveNearestCategory &&
        document.querySelector(".public-nearest-panel")
      ) {
        setTimeout(() => {
          showPublicNearest(publicActiveNearestCategory);
        }, 0);
      }
    });

    map.on("click", event => {
      if (!publicReportPickMode) return;
      publicReportPickMode = false;
      document.getElementById("publicReportButton")?.classList.remove("active");
      openPublicReportPanel(event.latlng);
    });
  }

  function publicCategoryItems(category) {
    const matchers = {
      school: item => item.type === "publicFacilities" && /مدرس|تعليم/.test(`${item.searchable} ${item.title}`),
      mosque: item => item.type === "publicFacilities" && /مسجد|مصلى|مصلي|ديني/.test(`${item.searchable} ${item.title}`),
      health: item => item.type === "publicFacilities" && /صحي|صحة|عيادة|مستوصف|طبي|مركز/.test(`${item.searchable} ${item.title}`),
      municipality: item => item.type === "municipalFacilities",
      landmarks: item => [
        "neighborhoods",
        "publicFacilities",
        "municipalFacilities",
        "entrances"
      ].includes(item.type),
      roads: item => item.type === "roads"
    };

    const matcher = matchers[category];
    return matcher ? state.indexes.filter(matcher) : [];
  }

  function publicEntranceTourPoints() {
    const entranceItems = state.indexes.filter(item => item.type === "entrances");
    if (entranceItems.length) {
      return entranceItems.slice(0, 2).map(item => ({
        title: item.title,
        desc: "أحد المداخل الرئيسية المؤدية إلى مخيم المغازي.",
        item
      }));
    }

    return [
      {
        title: "مدخل المغازي الرئيسي",
        desc: "المدخل الرئيسي الذي يربط المخيم بالشارع العام.",
        latlng: L.latLng(31.426341701, 34.377636494)
      },
      {
        title: "مدخل المغازي الشمالي",
        desc: "المدخل الذي يخدم الحركة من الجهة الشمالية للمخيم.",
        latlng: L.latLng(31.431183904, 34.382829668)
      }
    ];
  }

  function startPublicExploreTour() {
    closePublicToolPanels();

    const points = [...publicEntranceTourPoints()];

    const municipality = state.indexes.find(item =>
      item.type === "municipalFacilities" && /بلدية|المجلس/.test(`${item.searchable} ${item.title}`)
    ) || state.indexes.find(item => item.type === "municipalFacilities");

    if (municipality) {
      points.push({
        title: municipality.title || "مبنى بلدية المغازي",
        desc: "مرفق بلدي يقدم الخدمات الإدارية للمواطنين.",
        item: municipality
      });
    }

    const school = publicCategoryItems("school")[0];
    if (school) points.push({ title: school.title, desc: "موقع خدمة تعليمية داخل المخيم.", item: school });

    const health = publicCategoryItems("health")[0];
    if (health) points.push({ title: health.title, desc: "موقع خدمة صحية داخل المخيم.", item: health });

    const neighborhood = state.indexes.find(item => item.type === "neighborhoods");
    if (neighborhood) points.push({ title: neighborhood.title, desc: "عرض أحد الأحياء السكنية وحدوده.", item: neighborhood });

    if (!points.length) {
      toast("لا توجد بيانات كافية لبدء الجولة");
      return;
    }

    let index = 0;

    const showStep = () => {
      const step = points[index];
      const target = step.item ? centroid(step.item.layer) : step.latlng;

      map.setView(target, 17, { animate: true });
      if (step.item) step.item.layer.fire("click");

      let card = document.querySelector(".public-tour-card");
      if (!card) {
        card = document.createElement("div");
        card.className = "public-tour-card";
        document.querySelector(".map-area")?.appendChild(card);
      }

      card.innerHTML = `
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.desc)}</p>
        <div class="public-tour-progress">
          <span style="width:${((index + 1) / points.length) * 100}%"></span>
        </div>
      `;

      index += 1;
      if (index < points.length) {
        publicTourTimer = setTimeout(showStep, 2500);
      } else {
        publicTourTimer = setTimeout(() => {
          card.remove();
          toast("انتهت جولة استكشاف مخيم المغازي");
        }, 3000);
      }
    };

    toast("بدأت جولة استكشاف مخيم المغازي");
    showStep();
  }

  function showPublicPanel(title, html) {
    closePublicToolPanels();
    const panel = document.createElement("div");
    panel.className = "public-tools-panel";
    panel.innerHTML = `<h3>${escapeHtml(title)}</h3>${html}`;
    document.querySelector(".map-area")?.appendChild(panel);
    return panel;
  }

  function openPublicNearestPanel() {
    // تبقى لوحة معلومات المبنى أو المرفق ظاهرة، ولكن في الجهة المقابلة.
    if (map.hasLayer(facilityLabelsLayer)) {
      map.removeLayer(facilityLabelsLayer);
    }

    const panel = showPublicPanel("أقرب خدمة إليك", `
      <p>اختاري نوع الخدمة. سنحدد جميع مواقعها، ونوضح الأقرب بدون أرقام أو ازدحام.</p>
      <div class="public-tools-actions">
        <button type="button" data-public-nearest="school"><i class="fa-solid fa-school"></i> مدرسة</button>
        <button type="button" data-public-nearest="mosque"><i class="fa-solid fa-mosque"></i> مسجد</button>
        <button type="button" data-public-nearest="health"><i class="fa-solid fa-house-medical"></i> صحة</button>
        <button type="button" data-public-nearest="municipality"><i class="fa-solid fa-landmark"></i> مرفق بلدي</button>
        <button type="button" data-public-nearest="landmarks"><i class="fa-solid fa-map-location-dot"></i> معالم</button>
        <button type="button" data-public-nearest="roads"><i class="fa-solid fa-road"></i> شارع</button>
        <button type="button" id="publicUseLocationButton"><i class="fa-solid fa-location-crosshairs"></i> استخدم موقعي</button>
        <button type="button" class="danger" id="publicCloseNearestButton">إغلاق</button>
      </div>
      <div id="publicNearestResultsList" class="public-nearest-results-list"></div>
    `);

    panel.classList.add("public-nearest-panel");
    document.querySelector(".map-area")?.classList.add("public-nearest-layout");
    document.body.classList.add("public-nearest-layout");
    requestAnimationFrame(applySeparatedPanelsLayout);

    panel.querySelectorAll("[data-public-nearest]").forEach(button => {
      button.addEventListener("click", () => showPublicNearest(button.dataset.publicNearest));
    });

    panel.querySelector("#publicUseLocationButton")?.addEventListener("click", () => {
      toast("جارٍ تحديد موقعك...");
      map.locate({ setView: false, enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    });

    panel.querySelector("#publicCloseNearestButton")?.addEventListener("click", closePublicToolPanels);
  }

  function showNearestItemDetails(entry) {
    if (!entry?.item?.feature || !entry.item.layer) return;

    // افتح معلومات أقرب معلم تلقائيًا في لوحة التفاصيل المقابلة،
    // مع إبقاء لوحة أقرب خدمة مفتوحة في الجهة الأخرى.
    showDetails(entry.item.type, entry.item.feature, entry.item.layer);

    requestAnimationFrame(() => {
      applySeparatedPanelsLayout();
    });
  }

  function showPublicNearest(category) {
    publicActiveNearestCategory = category;

    const items = publicCategoryItems(category);
    if (!items.length) {
      toast("لا توجد بيانات كافية لهذه الخدمة");
      return;
    }

    // نُبقي لوحة معلومات العنصر مفتوحة في الجهة اليمنى، ونخفي فقط أسماء المرافق لتخفيف الازدحام.
    if (map.hasLayer(facilityLabelsLayer)) {
      map.removeLayer(facilityLabelsLayer);
    }

    const origin = publicLastUserLatLng || map.getCenter();

    const allMatches = items
      .map(item => {
        const target = centroid(item.layer);
        return {
          item,
          target,
          distance: origin.distanceTo(target),
          marker: null
        };
      })
      .sort((a, b) => a.distance - b.distance);

    // نعرض أسماء أقرب ثلاث خدمات فقط حتى لا تتعجق الخريطة،
    // لكننا نحدد جميع نقاط الفئة المختارة معًا.
    const nearby = allMatches.slice(0, 3);
    if (!nearby.length) return;

    if (publicNearestResultsLayer && map.hasLayer(publicNearestResultsLayer)) {
      map.removeLayer(publicNearestResultsLayer);
    }

    publicNearestResultsLayer = L.layerGroup().addTo(map);

    // ضبط الخريطة أولًا ثم رسم الأسماء، حتى نحسب أماكنها بدون تداخل.
    const resultBounds = L.latLngBounds([origin, ...allMatches.map(entry => entry.target)]);
    const detailsPanelOpen = document.getElementById("detailsPanel")?.classList.contains("open");
    map.fitBounds(resultBounds, {
      paddingTopLeft: [390, 70],
      paddingBottomRight: [detailsPanelOpen ? 390 : 70, 70],
      maxZoom: 17,
      animate: false
    });

    // موقع الانطلاق.
    L.circleMarker(origin, {
      pane: "publicToolsPane",
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: "#8f1d1d",
      fillOpacity: 1
    })
      .bindTooltip("موقع الانطلاق", {
        direction: "top",
        className: "public-nearest-tooltip"
      })
      .addTo(publicNearestResultsLayer);

    // تحديد جميع النقاط، بدون أرقام وبدون أسماء دائمة لكل النقاط.
    allMatches.forEach((entry, index) => {
      const isNearest = index === 0;

      const marker = L.circleMarker(entry.target, {
        pane: "publicToolsPane",
        radius: isNearest ? 9 : 6,
        color: "#ffffff",
        weight: isNearest ? 3 : 2,
        fillColor: isNearest ? "#2563eb" : "#0ea5e9",
        fillOpacity: isNearest ? 1 : 0.72,
        opacity: 1
      })
        .bindTooltip(
          `${escapeHtml(entry.item.title)} — ${Math.round(entry.distance).toLocaleString("en-US")} متر`,
          {
            direction: "top",
            offset: [0, -8],
            className: "public-nearest-tooltip"
          }
        )
        .on("click", function () {
          map.setView(entry.target, Math.max(map.getZoom(), 18), { animate: true });
          this.openTooltip();
          showNearestItemDetails(entry);
        })
        .addTo(publicNearestResultsLayer);

      entry.marker = marker;
    });

    // خط واحد فقط إلى أقرب خدمة حتى لا تصبح الخريطة مزدحمة.
    publicNearestLine = L.polyline([origin, nearby[0].target], {
      pane: "publicToolsPane",
      color: "#0ea5e9",
      weight: 4,
      opacity: 0.95,
      dashArray: "8 7",
      lineCap: "round",
      lineJoin: "round",
      interactive: false
    }).addTo(publicNearestResultsLayer);

    // توزيع أسماء أقرب ثلاث خدمات ومنع تداخلها أو ظهورها فوق اللوحة الجانبية.
    const mapElement = document.getElementById("map");
    const mapRect = mapElement?.getBoundingClientRect();
    const panelRect = document.querySelector(".public-tools-panel")?.getBoundingClientRect();
    const blockedRects = [];

    if (mapRect && panelRect) {
      blockedRects.push({
        left: panelRect.left - mapRect.left - 6,
        right: panelRect.right - mapRect.left + 6,
        top: panelRect.top - mapRect.top - 6,
        bottom: panelRect.bottom - mapRect.top + 6
      });
    }

    const placedRects = [...blockedRects];
    const mapSize = map.getSize();

    const overlaps = (a, b, margin = 5) => !(
      a.right + margin <= b.left ||
      a.left >= b.right + margin ||
      a.bottom + margin <= b.top ||
      a.top >= b.bottom + margin
    );

    nearby.forEach(entry => {
      const name = String(entry.item.title || "خدمة");
      const width = Math.min(165, Math.max(82, 46 + name.length * 6.2));
      const height = 27;
      const sourcePoint = map.latLngToLayerPoint(entry.target);

      const candidates = [
        [0, -27],
        [width / 2 + 14, 0],
        [-(width / 2 + 14), 0],
        [0, 27],
        [width / 2 + 10, -23],
        [-(width / 2 + 10), -23]
      ];

      let chosen = null;

      for (const [dx, dy] of candidates) {
        const center = L.point(sourcePoint.x + dx, sourcePoint.y + dy);
        const rect = {
          left: center.x - width / 2,
          right: center.x + width / 2,
          top: center.y - height / 2,
          bottom: center.y + height / 2
        };

        const insideMap =
          rect.left >= 5 &&
          rect.top >= 5 &&
          rect.right <= mapSize.x - 5 &&
          rect.bottom <= mapSize.y - 5;

        if (!insideMap) continue;
        if (placedRects.some(existing => overlaps(rect, existing))) continue;

        chosen = { dx, dy, rect };
        break;
      }

      if (!chosen) return;

      L.marker(entry.target, {
        pane: "publicToolsPane",
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "public-nearest-service-label",
          html: `<span>${escapeHtml(name)}</span>`,
          iconSize: [width, height],
          iconAnchor: [width / 2 - chosen.dx, height / 2 - chosen.dy]
        })
      }).addTo(publicNearestResultsLayer);

      placedRects.push(chosen.rect);
    });

    // قائمة مختصرة بدون أرقام.
    const resultsList = document.getElementById("publicNearestResultsList");
    if (resultsList) {
      resultsList.innerHTML = nearby.map((entry, index) => `
        <button type="button" class="public-nearest-result-item" data-nearest-index="${index}">
          <span>${escapeHtml(entry.item.title)}</span>
          <span class="public-nearest-result-distance">${Math.round(entry.distance).toLocaleString("en-US")} m</span>
        </button>
      `).join("");

      resultsList.querySelectorAll("[data-nearest-index]").forEach(button => {
        button.addEventListener("click", () => {
          const entry = nearby[Number(button.dataset.nearestIndex)];
          if (!entry) return;
          map.setView(entry.target, 18, { animate: true });
          entry.marker?.openTooltip();
          showNearestItemDetails(entry);
        });
      });
    }

    // افتح معلومات أقرب نتيجة تلقائيًا، مثل حي الاستقامة أو أقرب مرفق.
    showNearestItemDetails(nearby[0]);

    toast(`تم تحديد ${allMatches.length} موقعًا، وظهرت معلومات أقرب نتيجة`);
  }

  function startPublicReportPick() {
    closePublicToolPanels();
    publicReportPickMode = true;
    document.getElementById("publicReportButton")?.classList.add("active");
    toast("اضغطي على مكان المشكلة داخل الخريطة");
  }

  function openPublicReportPanel(latlng) {
    closePublicToolPanels();

    if (publicReportMarker) {
      map.removeLayer(publicReportMarker);
      publicReportMarker = null;
    }

    const panel = document.createElement("div");
    panel.className = "public-report-panel";
    panel.innerHTML = `
      <h3>إرسال بلاغ من هذا الموقع</h3>
      <p>تم اختيار الإحداثيات تلقائيًا من المكان الذي ضغطتِ عليه.</p>
      <input id="publicReportCoords" readonly value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}">
      <select id="publicReportType">
        <option value="مياه">مياه</option>
        <option value="صرف صحي">صرف صحي</option>
        <option value="نظافة">نظافة</option>
        <option value="طريق">طريق</option>
        <option value="إنارة">إنارة</option>
        <option value="أخرى">أخرى</option>
      </select>
      <textarea id="publicReportDescription" placeholder="اكتبي وصف المشكلة..."></textarea>
      <div class="public-tools-actions">
        <a class="primary" id="publicOpenReportLink" target="_blank" rel="noopener">فتح نموذج البلاغ</a>
        <button type="button" id="publicCopyReportCoords">نسخ الإحداثيات</button>
        <button type="button" class="danger" id="publicCloseReportPanel">إغلاق</button>
      </div>
    `;

    document.querySelector(".map-area")?.appendChild(panel);

    publicReportMarker = L.circleMarker(latlng, {
      radius: 8,
      color: "#ffffff",
      weight: 3,
      fillColor: "#dc2626",
      fillOpacity: 1
    }).addTo(map).bindPopup("موقع البلاغ").openPopup();

    const updateReportLink = () => {
      const type = panel.querySelector("#publicReportType")?.value || "أخرى";
      const description = panel.querySelector("#publicReportDescription")?.value || "بلاغ من الخريطة";
      const link = panel.querySelector("#publicOpenReportLink");
      if (link) {
        link.href = `${CONFIG.complaintUrl}?lat=${encodeURIComponent(latlng.lat)}&lng=${encodeURIComponent(latlng.lng)}&type=${encodeURIComponent(type)}&desc=${encodeURIComponent(description)}`;
      }
    };

    panel.querySelector("#publicReportType")?.addEventListener("change", updateReportLink);
    panel.querySelector("#publicReportDescription")?.addEventListener("input", updateReportLink);

    panel.querySelector("#publicCopyReportCoords")?.addEventListener("click", async () => {
      const coords = panel.querySelector("#publicReportCoords")?.value || "";
      await navigator.clipboard.writeText(coords);
      toast("تم نسخ إحداثيات البلاغ");
    });

    panel.querySelector("#publicCloseReportPanel")?.addEventListener("click", () => {
      if (publicReportMarker) map.removeLayer(publicReportMarker);
      publicReportMarker = null;
      panel.remove();
    });

    updateReportLink();
  }



  /* =========================================================
     تحسين عرض الخريطة على الجوال
     يقلل الزحمة ويحوّل لوحة التفاصيل إلى نافذة سفلية مدمجة.
     ========================================================= */
  const mobileResponsiveStyle = document.createElement("style");
  mobileResponsiveStyle.id = "mobileResponsiveFix";
  mobileResponsiveStyle.textContent = `
    @media (max-width: 760px) {
      html,
      body {
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
        overscroll-behavior: none !important;
      }

      .topbar {
        min-height: 0 !important;
        height: auto !important;
        display: grid !important;
        grid-template-columns: 46px minmax(0, 1fr) !important;
        grid-template-areas:
          "brand actions"
          "search search" !important;
        align-items: center !important;
        gap: 7px 8px !important;
        padding: 7px 9px 8px !important;
      }

      .brand {
        grid-area: brand !important;
        min-width: 0 !important;
        width: 42px !important;
        gap: 0 !important;
      }

      .brand > div {
        display: none !important;
      }

      .brand-logo {
        width: 40px !important;
        height: 40px !important;
        padding: 3px !important;
        border-radius: 12px !important;
      }

      .top-actions {
        grid-area: actions !important;
        display: flex !important;
        justify-content: flex-start !important;
        gap: 6px !important;
        margin: 0 !important;
        min-width: 0 !important;
      }

      .top-actions .icon-btn,
      .public-map-tools-button {
        width: 40px !important;
        min-width: 40px !important;
        height: 40px !important;
        border-radius: 11px !important;
        font-size: 15px !important;
      }

      .global-search {
        grid-area: search !important;
        order: initial !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
      }

      .global-search input {
        height: 42px !important;
        padding-right: 42px !important;
        padding-left: 38px !important;
        font-size: 13px !important;
      }

      .global-search > i {
        right: 14px !important;
        font-size: 15px !important;
      }

      .global-search > button {
        top: 6px !important;
        left: 7px !important;
      }

      .app-shell {
        height: calc(100dvh - var(--mobile-topbar-height, 104px)) !important;
        min-height: 0 !important;
      }

      .map-area,
      #map {
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
      }

      .stats-strip {
        top: calc(var(--mobile-topbar-height, 104px) + 7px) !important;
        left: 7px !important;
        right: 7px !important;
        width: auto !important;
        max-width: none !important;
        height: 54px !important;
        transform: none !important;
        overflow: hidden !important;
        pointer-events: auto !important;
      }

      .forced-compact-stats {
        justify-content: flex-start !important;
        gap: 5px !important;
        height: 54px !important;
        padding: 3px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        scroll-snap-type: x proximity !important;
        scrollbar-width: none !important;
      }

      .forced-compact-stats::-webkit-scrollbar {
        display: none !important;
      }

      .forced-stat-card {
        flex: 0 0 86px !important;
        width: 86px !important;
        min-width: 86px !important;
        max-width: 86px !important;
        height: 48px !important;
        min-height: 48px !important;
        grid-template-columns: 19px minmax(0, 1fr) !important;
        column-gap: 4px !important;
        padding: 4px 5px !important;
        border-radius: 10px !important;
        scroll-snap-align: start !important;
      }

      .forced-stat-card i {
        font-size: 14px !important;
      }

      .forced-stat-value {
        font-size: 13px !important;
      }

      .forced-stat-label {
        font-size: 9px !important;
      }

      .map-toolbar {
        top: 67px !important;
        left: 7px !important;
        gap: 5px !important;
      }

      .map-toolbar button {
        width: 38px !important;
        height: 38px !important;
        border-radius: 11px !important;
        font-size: 14px !important;
      }

      #detailsPanel.details-panel {
        position: fixed !important;
        left: 8px !important;
        right: 8px !important;
        top: auto !important;
        bottom: 8px !important;
        width: auto !important;
        max-width: none !important;
        height: auto !important;
        max-height: min(58dvh, 540px) !important;
        padding: 14px !important;
        border-radius: 20px !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        transform: translateY(calc(100% + 24px)) !important;
        transition: transform .28s ease !important;
        z-index: 10021 !important;
      }

      #detailsPanel.details-panel.open {
        transform: translateY(0) !important;
      }

      #detailsPanel .close-details,
      #closeDetailsBtn {
        top: 10px !important;
        left: 10px !important;
        width: 34px !important;
        height: 34px !important;
        font-size: 15px !important;
      }

      #detailsPanel .details-hero {
        padding: 20px 0 10px !important;
      }

      #detailsPanel #detailType {
        padding: 5px 10px !important;
        font-size: 10px !important;
      }

      #detailsPanel #detailTitle,
      #detailsPanel .details-hero h2 {
        margin: 9px 0 5px !important;
        font-size: 19px !important;
        line-height: 1.45 !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        display: -webkit-box !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 2 !important;
        overflow: hidden !important;
      }

      #detailsPanel #detailSubtitle,
      #detailsPanel .details-hero p {
        font-size: 11px !important;
      }

      #detailImageBox {
        margin: 9px 0 10px !important;
        border-radius: 13px !important;
      }

      #detailImageBox img {
        height: 135px !important;
      }

      #detailImageCaption {
        padding: 5px 8px !important;
        font-size: 10px !important;
      }

      #detailsPanel .detail-fields,
      #detailFields {
        padding: 7px 0 !important;
        margin: 0 !important;
      }

      #detailsPanel .detail-row {
        gap: 8px !important;
        padding: 7px 0 !important;
        font-size: 11.5px !important;
      }

      #detailsPanel .detail-actions {
        gap: 6px !important;
      }

      #detailsPanel .detail-actions a,
      #detailsPanel .detail-actions button,
      #googleMapsBtn,
      #copyCoordsBtn,
      #printDetailsBtn,
      #shareBtn {
        min-height: 40px !important;
        padding: 7px 5px !important;
        border-radius: 10px !important;
        font-size: 10.5px !important;
      }

      #complaintBtn,
      #detailsPanel .detail-actions .complaint {
        min-height: 42px !important;
        padding: 8px !important;
        margin-top: 2px !important;
        font-size: 11px !important;
      }

      body:has(#detailsPanel.open) .stats-strip,
      body:has(#detailsPanel.open) .map-toolbar,
      body:has(#detailsPanel.open) .leaflet-control-zoom,
      body:has(#detailsPanel.open) .leaflet-control-scale {
        display: none !important;
      }

      .map-status {
        display: none !important;
      }

      .leaflet-control-attribution {
        max-width: 70vw !important;
        font-size: 8px !important;
        line-height: 1.15 !important;
      }

      .public-nearest-panel,
      .public-tools-panel,
      .public-report-panel,
      .public-tour-card {
        left: 8px !important;
        right: 8px !important;
        width: auto !important;
        max-width: none !important;
        border-radius: 18px !important;
      }
    }
  `;
  document.head.appendChild(mobileResponsiveStyle);

  function updateMobileViewportLayout() {
    const topbar = document.querySelector(".topbar");
    const topbarHeight = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 104;
    document.documentElement.style.setProperty("--mobile-topbar-height", `${topbarHeight}px`);

    if (typeof map?.invalidateSize === "function") {
      setTimeout(() => map.invalidateSize({ pan: false }), 80);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateMobileViewportLayout, { once: true });
  } else {
    updateMobileViewportLayout();
  }

  window.addEventListener("resize", updateMobileViewportLayout);
  window.addEventListener("orientationchange", () => {
    setTimeout(updateMobileViewportLayout, 180);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", compactStatisticsCards, { once: true });
  } else {
    compactStatisticsCards();
  }

  window.addEventListener("resize", () => {
    if (document.querySelector(".public-nearest-panel")) {
      requestAnimationFrame(applySeparatedPanelsLayout);
    }
  });

  boot();
})();