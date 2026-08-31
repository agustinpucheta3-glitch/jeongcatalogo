const WHATSAPP_NUMBER = "5491172393830";


// unique id per item
CATALOG.forEach((cat,ci)=>cat.items.forEach((it,ii)=>it.id = ci+"-"+ii));

const cart = {}; // id -> qty
const fmt = n => "$" + n.toLocaleString("es-AR");

function totalProducts(){
  return CATALOG.reduce((a,c)=>a+c.items.length,0);
}

function buildNav(){
  const nav = document.getElementById("catnav");
  CATALOG.forEach(cat=>{
    const btn = document.createElement("button");
    btn.textContent = cat.n + " · " + cat.title;
    btn.onclick = ()=>{
      document.getElementById("sec-"+cat.n).scrollIntoView({behavior:"smooth", block:"start"});
    };
    btn.dataset.target = cat.n;
    nav.appendChild(btn);
  });
}

function buildSections(){
  const main = document.getElementById("sections");
  CATALOG.forEach(cat=>{
    const sec = document.createElement("section");
    sec.className = "section";
    sec.id = "sec-"+cat.n;

    sec.innerHTML = `
      <div class="section-head">
        <span class="section-num">${cat.n}</span>
        <h2>${cat.title}</h2>
      </div>
      <div class="section-count">${cat.items.length} producto${cat.items.length===1?'':'s'}</div>
      <div class="grid" id="grid-${cat.n}"></div>
    `;
    main.appendChild(sec);

    const grid = sec.querySelector(".grid");
    cat.items.forEach(it=>{
      const card = document.createElement("div");
      card.className = "card";
      card.id = "card-"+it.id;
      if(it.benefit){ card.setAttribute("data-has-detail","1"); }
      card.innerHTML = `
        <div class="card-img-wrap"><img class="card-img" src="${it.img}" alt="${it.name}" loading="lazy"></div>
        <div class="card-name">${it.name}</div>
        <div class="card-size">${it.size}</div>
        <div class="card-bottom">
          <div class="card-price">${fmt(it.price)}</div>
          <div class="stepper">
            <button aria-label="Restar" data-act="minus" data-id="${it.id}">−</button>
            <input class="qty" id="qty-${it.id}" type="number" inputmode="numeric" min="0" step="1" value="0" data-id="${it.id}" aria-label="Cantidad">
            <button aria-label="Sumar" data-act="plus" data-id="${it.id}">+</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  });

  main.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-act]");
    if(btn){
      const id = btn.dataset.id;
      const delta = btn.dataset.act === "plus" ? 1 : -1;
      changeQty(id, delta);
      return;
    }
    // open detail panel when tapping the card itself (not the stepper area)
    const card = e.target.closest(".card[data-has-detail]");
    if(card && !e.target.closest(".stepper")){
      const id = card.id.replace("card-","");
      openPanel(id);
    }
  });

  // typed quantity: commit on Enter or on blur
  main.addEventListener("change", (e)=>{
    const input = e.target.closest("input.qty");
    if(!input) return;
    setQty(input.dataset.id, input.value);
  });
  main.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && e.target.classList && e.target.classList.contains("qty")){
      e.target.blur();
    }
  });
}

function findItem(id){
  const [ci,ii] = id.split("-").map(Number);
  return CATALOG[ci].items[ii];
}

function changeQty(id, delta){
  const current = cart[id] || 0;
  const next = Math.max(0, current + delta);
  applyQty(id, next);
}

function setQty(id, rawValue){
  let next = parseInt(rawValue, 10);
  if(isNaN(next) || next < 0) next = 0;
  applyQty(id, next);
}

function applyQty(id, next){
  if(next === 0) delete cart[id];
  else cart[id] = next;

  document.getElementById("qty-"+id).value = next;
  document.getElementById("card-"+id).classList.toggle("in-cart", next > 0);
  if(typeof panelItemId !== "undefined" && panelItemId === id){
    const pq = document.getElementById("panelQty");
    if(pq) pq.value = next;
  }
  renderCart();
}

function renderCart(){
  const ids = Object.keys(cart);
  const count = ids.reduce((a,id)=>a+cart[id],0);
  const total = ids.reduce((a,id)=>a+cart[id]*findItem(id).price,0);

  document.getElementById("cartCount").textContent = count;
  document.getElementById("cartTotal").textContent = fmt(total);
  document.getElementById("sendBtn").disabled = count === 0;

  const list = document.getElementById("cartList");
  if(ids.length === 0){
    list.innerHTML = `<div class="comanda-empty">Todavía no agregaste productos. Elegí cantidades arriba y volvé acá para revisar tu pedido.</div>`;
    return;
  }
  list.innerHTML = "";
  ids.forEach(id=>{
    const it = findItem(id);
    const qty = cart[id];
    const row = document.createElement("div");
    row.className = "comanda-item";
    row.innerHTML = `
      <div class="ci-name">${it.name}<small>${it.size}</small></div>
      <div class="ci-qty">×${qty}</div>
      <div class="ci-price">${fmt(it.price*qty)}</div>
      <button class="ci-remove" data-remove="${id}" aria-label="Quitar">✕</button>
    `;
    list.appendChild(row);
  });
}

document.getElementById("cartList").addEventListener("click",(e)=>{
  const rm = e.target.closest("[data-remove]");
  if(!rm) return;
  const id = rm.dataset.remove;
  delete cart[id];
  document.getElementById("qty-"+id).value = 0;
  document.getElementById("card-"+id).classList.remove("in-cart");
  renderCart();
});

// toggle comanda open/close
const comandaInner = document.getElementById("comandaInner");
document.getElementById("comandaTab").addEventListener("click", ()=>{
  comandaInner.classList.toggle("open");
});

document.getElementById("sendBtn").addEventListener("click", ()=>{
  const ids = Object.keys(cart);
  if(ids.length === 0) return;
  let msg = "Hola! Quiero hacer este pedido a jeong:\n\n";
  let total = 0;
  ids.forEach(id=>{
    const it = findItem(id);
    const qty = cart[id];
    const sub = it.price*qty;
    total += sub;
    msg += `• ${qty}x ${it.name} (${it.size}) — ${fmt(sub)}\n`;
  });
  msg += `\nTotal: ${fmt(total)}`;
  const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
  window.open(url, "_blank");
});

document.getElementById("metaProducts").textContent = totalProducts();
buildNav();
buildSections();
renderCart();

// scroll-spy for nav active state
const sections = CATALOG.map(c=>document.getElementById("sec-"+c.n));
const navButtons = Array.from(document.getElementById("catnav").children);
const spy = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      const idx = sections.indexOf(entry.target);
      navButtons.forEach(b=>b.classList.remove("active"));
      if(navButtons[idx]) navButtons[idx].classList.add("active");
    }
  });
}, {rootMargin:"-20% 0px -70% 0px"});
sections.forEach(s=>spy.observe(s));

// ---- product detail panel ----
let panelItemId = null;
const panelOverlay = document.getElementById("panelOverlay");
const productPanel = document.getElementById("productPanel");

function fillPanelSection(wrapId, textId, value){
  const wrap = document.getElementById(wrapId);
  if(value){
    document.getElementById(textId).textContent = value;
    wrap.style.display = "";
  } else {
    wrap.style.display = "none";
  }
}

function renderPanelGallery(it){
  const photos = (it.images && it.images.length) ? it.images : [it.img];
  const track = document.getElementById("panelGalleryTrack");
  const dots = document.getElementById("panelGalleryDots");
  track.innerHTML = "";
  dots.innerHTML = "";
  photos.forEach((src, i)=>{
    const im = document.createElement("img");
    im.src = src;
    im.alt = it.name + " - foto " + (i+1);
    im.loading = "lazy";
    track.appendChild(im);
  });
  if(photos.length > 1){
    photos.forEach((_, i)=>{
      const dot = document.createElement("span");
      if(i===0) dot.classList.add("active");
      dots.appendChild(dot);
    });
    track.onscroll = ()=>{
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      Array.from(dots.children).forEach((d,i)=>d.classList.toggle("active", i===idx));
    };
  }
  track.scrollLeft = 0;
}

function openPanel(id){
  const it = findItem(id);
  panelItemId = id;
  renderPanelGallery(it);
  document.getElementById("panelEyebrow").textContent = catTitleForId(id);
  document.getElementById("panelTitle").textContent = it.name;
  document.getElementById("panelSize").textContent = it.size;
  document.getElementById("panelPrice").textContent = fmt(it.price);
  fillPanelSection("panelBenefitWrap","panelBenefit", it.benefit);
  fillPanelSection("panelSkinWrap","panelSkin", it.skin);
  fillPanelSection("panelIngredientsWrap","panelIngredients", it.ingredients);
  fillPanelSection("panelModoWrap","panelModo", it.modo);
  document.getElementById("panelQty").value = cart[id] || 0;

  panelOverlay.classList.add("open");
  productPanel.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePanel(){
  panelOverlay.classList.remove("open");
  productPanel.classList.remove("open");
  document.body.style.overflow = "";
  panelItemId = null;
}

function catTitleForId(id){
  const [ci] = id.split("-").map(Number);
  const cat = CATALOG[ci];
  return cat ? (cat.n + " · " + cat.title) : "";
}

document.getElementById("panelClose").addEventListener("click", closePanel);
panelOverlay.addEventListener("click", closePanel);
document.addEventListener("keydown",(e)=>{
  if(e.key === "Escape") closePanel();
});

document.getElementById("panelStepper").addEventListener("click",(e)=>{
  const btn = e.target.closest("button[data-panel-act]");
  if(!btn || !panelItemId) return;
  const delta = btn.dataset.panelAct === "plus" ? 1 : -1;
  changeQty(panelItemId, delta);
  document.getElementById("panelQty").value = cart[panelItemId] || 0;
});
document.getElementById("panelQty").addEventListener("change",(e)=>{
  if(!panelItemId) return;
  setQty(panelItemId, e.target.value);
});
