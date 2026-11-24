const WHATSAPP_NUMBER = "5491172393830";
const MIN_ORDER = 250000; // compra minima mayorista, en pesos
const SHIPPING_COST = 15000; // envio fijo por Andreani, en pesos
let shippingCalculated = false;

document.getElementById("whatsappFab").href =
  "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent("¡Hola! Quería hacerles una consulta sobre jeong.");


// unique id per item
CATALOG.forEach((cat,ci)=>cat.items.forEach((it,ii)=>it.id = ci+"-"+ii));

const cart = {}; // id -> qty
const fmt = n => "$" + n.toLocaleString("es-AR");

// ---- PRE VENTA: se abona la mitad ahora y la otra mitad al recibir ----
const isPre = it => !!it.preventa && !it.soldOut;

function preventaDateLabel(){
  const d = new Date(PREVENTA_FECHA + "T00:00:00");
  return d.toLocaleDateString("es-AR", {day:"numeric", month:"long"});
}

function preventaNoteText(){
  return "Andá reservando tus unidades de los nuevos ingresos abonando la mitad. Disponibles a partir del " + preventaDateLabel() + ".";
}

// Secciones visibles: PRE VENTAS primero (junta los productos marcados como
// preventa, sin duplicar fichas) y despues las categorias que tengan productos.
function getSections(){
  const list = [];
  const pre = [];
  CATALOG.forEach(cat=>cat.items.forEach(it=>{ if(isPre(it)) pre.push(it); }));
  if(pre.length) list.push({ n:"PV", title:"PRE VENTAS", label:"PRE VENTAS", items:pre, pv:true });
  CATALOG.forEach(cat=>{
    if(cat.items.length) list.push({ n:cat.n, title:cat.title, label:cat.n+" · "+cat.title, items:cat.items, pv:false });
  });
  return list;
}
const SECTIONS = getSections();

// ---- CODIGO DE DESCUENTO ----
// Lo valida la funcion de Netlify (netlify/functions/descuento.mjs); los codigos y su
// vencimiento se cargan en data/codigos.json. Se descuenta sobre el valor completo del
// pedido (el envio no se descuenta) y el minimo mayorista se mide antes del descuento.
let discount = null; // { codigo, tipo, valor, vence, compra_minima }

function discountExpired(d){
  return !!(d && d.vence && !(Date.now() <= Date.parse(d.vence)));
}

function discountAmount(d, base){
  if(!d || base <= 0) return 0;
  return d.tipo === "monto" ? Math.min(d.valor, base) : Math.round(base * d.valor / 100);
}

function cartTotals(){
  const ids = Object.keys(cart);
  let grossStock = 0, grossPre = 0;
  ids.forEach(id=>{
    const it = findItem(id);
    const sub = it.price * cart[id];
    if(isPre(it)) grossPre += sub; else grossStock += sub;
  });
  const fullTotal = grossStock + grossPre;     // valor completo (para el minimo de compra)
  const disc = discountExpired(discount) ? 0 : discountAmount(discount, fullTotal);
  const netTotal = fullTotal - disc;
  // El descuento se reparte en forma proporcional entre lo que hay en stock y la preventa.
  const pre = fullTotal ? Math.round(grossPre * netTotal / fullTotal) : 0;
  const stock = netTotal - pre;
  const deposit = pre / 2;
  return {
    ids,
    count: ids.reduce((a,id)=>a+cart[id],0),
    stock, pre, deposit,            // ya con el descuento aplicado
    rest: pre - deposit,            // la otra mitad, a pagar al recibir
    payableNow: stock + deposit,    // lo que se cobra ahora (sin envio)
    fullTotal,
    discount: disc, netTotal,
    ratio: fullTotal ? netTotal / fullTotal : 1,
    hasPre: grossPre > 0
  };
}

function totalProducts(){
  return CATALOG.reduce((a,c)=>a+c.items.length,0);
}

// dias que faltan hasta restockDate (baja solo, dia a dia, sin tocar codigo)
function daysUntilRestock(dateStr){
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

function restockLabel(it){
  if(!it.restockDate) return "No disponible";
  const days = daysUntilRestock(it.restockDate);
  if(days <= 0) return "Disponible en breve";
  return "Disponible en " + days + (days === 1 ? " día" : " días");
}
function lastUnitsLabel(it){
  const n = typeof it.lastUnits === "number" ? it.lastUnits : 0;
  if(n === 1) return "🔥 Última unidad";
  if(n > 1) return "🔥 Últimas " + n + " unidades";
  return "🔥 Últimas unidades";
}

// Cartel sobre la foto: "Últimas unidades" si corresponde y, si no, "Nuevos ingresos".
// Un producto agotado no lleva cartel.
function tagLabel(it){
  if(it.soldOut) return "";
  if(it.lastUnits) return lastUnitsLabel(it);
  if(it.nuevo) return "🔥 Nuevos ingresos";
  return "";
}

function buildNav(){
  const nav = document.getElementById("catnav");
  SECTIONS.forEach(s=>{
    const btn = document.createElement("button");
    btn.textContent = s.label;
    if(s.pv) btn.classList.add("pv");
    btn.onclick = ()=>{
      document.getElementById("sec-"+s.n).scrollIntoView({behavior:"smooth", block:"start"});
    };
    btn.dataset.target = s.n;
    nav.appendChild(btn);
  });
}

// Un mismo producto puede estar en dos secciones (PRE VENTAS y su categoria):
// por eso las tarjetas se identifican con data-id y no con un id unico.
function cardDomId(s, it){ return (s.pv ? "pv-card-" : "card-") + it.id; }

function buildSections(){
  const main = document.getElementById("sections");
  SECTIONS.forEach(s=>{
    const sec = document.createElement("section");
    sec.className = "section";
    sec.id = "sec-"+s.n;

    sec.innerHTML = `
      <div class="section-head">
        ${s.pv ? '' : `<span class="section-num">${s.n}</span>`}
        <h2>${s.title}</h2>
      </div>
      ${s.pv ? `<p class="section-note">${preventaNoteText()}</p>` : ''}
      <div class="section-count">${s.items.length} producto${s.items.length===1?'':'s'}</div>
      <div class="grid" id="grid-${s.n}"></div>
    `;
    main.appendChild(sec);

    const grid = sec.querySelector(".grid");
    s.items.forEach(it=>{
      const pre = isPre(it);
      const card = document.createElement("div");
      card.className = "card" + (it.soldOut ? " sold-out" : "");
      card.id = cardDomId(s, it);
      card.dataset.id = it.id;
      if(it.benefit){ card.setAttribute("data-has-detail","1"); }
      card.innerHTML = `
        <div class="card-img-wrap">
          <img class="card-img" src="${it.img}" alt="${it.name}" loading="lazy">
          ${it.soldOut ? '<span class="sold-out-badge">Agotado</span>' : ''}
          ${pre ? '<span class="preventa-badge">Preventa</span>' : ''}
          ${!pre && tagLabel(it) ? `<span class="last-units-badge">${tagLabel(it)}</span>` : ''}
        </div>
        <div class="card-name">${it.name}</div>
        <div class="card-size">${it.size}</div>
        ${pre ? `<div class="preventa-note">Llega a partir del ${preventaDateLabel()}</div>` : ''}
        <div class="card-bottom">
          <div class="card-price">${fmt(it.price)}</div>
          ${it.soldOut ? `
          <div class="restock-note">${restockLabel(it)}</div>
          ` : `
          <div class="stepper">
            <button aria-label="Restar" data-act="minus" data-id="${it.id}">−</button>
            <input class="qty" type="number" inputmode="numeric" min="0" step="1" value="0" data-id="${it.id}" aria-label="Cantidad">
            <button aria-label="Sumar" data-act="plus" data-id="${it.id}">+</button>
          </div>
          `}
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
      openPanel(card.dataset.id);
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
  if(findItem(id).soldOut) return;
  const current = cart[id] || 0;
  const next = Math.max(0, current + delta);
  applyQty(id, next);
}

function setQty(id, rawValue){
  if(findItem(id).soldOut) return;
  let next = parseInt(rawValue, 10);
  if(isNaN(next) || next < 0) next = 0;
  applyQty(id, next);
}

// Actualiza la cantidad y el resaltado en todas las tarjetas del producto
// (puede estar en PRE VENTAS y en su categoria a la vez).
function syncCardsFor(id, qty){
  document.querySelectorAll('input.qty[data-id="'+id+'"]').forEach(inp=>{ inp.value = qty; });
  document.querySelectorAll('.card[data-id="'+id+'"]').forEach(c=>c.classList.toggle("in-cart", qty > 0));
}

// Aviso breve cuando se intenta superar el maximo por pedido (campo maxQty).
let limitTimer;
function showLimitNote(max){
  let el = document.getElementById("limitNote");
  if(!el){
    el = document.createElement("div");
    el.id = "limitNote";
    el.className = "limit-note";
    document.body.appendChild(el);
  }
  el.textContent = "Máximo " + max + (max === 1 ? " unidad" : " unidades") + " por pedido de este producto.";
  el.classList.add("visible");
  clearTimeout(limitTimer);
  limitTimer = setTimeout(()=>el.classList.remove("visible"), 2500);
}

function applyQty(id, next){
  const prev = cart[id] || 0;
  const maxQty = findItem(id).maxQty;
  if(maxQty && next > maxQty){ next = maxQty; showLimitNote(maxQty); }
  if(next === 0) delete cart[id];
  else cart[id] = next;

  syncCardsFor(id, next);
  if(typeof panelItemId !== "undefined" && panelItemId === id){
    const pq = document.getElementById("panelQty");
    if(pq) pq.value = next;
  }

  if(next > prev && typeof fbq === "function"){
    const it = findItem(id);
    fbq("track", "AddToCart", {
      content_ids: [id],
      content_name: it.name,
      content_type: "product",
      value: it.price * (next - prev),
      currency: "ARS"
    });
  }

  renderCart();
}

function setDiscountMsg(text){
  const el = document.getElementById("discountMsg");
  el.textContent = text || "";
  el.hidden = !text;
}

function expiryLabel(vence){
  return new Date(vence).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false
  }) + " hs";
}

// Saca el codigo si ya vencio o si el pedido dejo de cumplir su compra minima.
function dropInvalidDiscount(){
  if(!discount) return;
  if(discountExpired(discount)){
    setDiscountMsg(`El código ${discount.codigo} venció.`);
    discount = null;
  } else if(discount.compra_minima && cartTotals().fullTotal < discount.compra_minima){
    setDiscountMsg(`El código ${discount.codigo} necesita un pedido de al menos ${fmt(discount.compra_minima)}.`);
    discount = null;
  }
}

function renderDiscountBox(t){
  document.getElementById("discountBox").hidden = t.count === 0;
  const applied = !!discount;
  document.getElementById("discountForm").hidden = applied;
  document.getElementById("discountApplied").hidden = !applied;
  if(!applied) return;
  document.getElementById("discountAppliedLabel").textContent =
    "Código " + discount.codigo + (discount.tipo === "porcentaje" ? " · " + discount.valor + "% OFF" : " · " + fmt(discount.valor) + " OFF");
  document.getElementById("discountSubtotal").textContent = fmt(t.fullTotal);
  document.getElementById("discountAmount").textContent = "−" + fmt(t.discount);
  const exp = document.getElementById("discountExpiry");
  exp.hidden = !discount.vence;
  if(discount.vence) exp.textContent = "Válido hasta el " + expiryLabel(discount.vence) + ".";
}

function renderCart(){
  dropInvalidDiscount();
  const t = cartTotals();
  const { ids, count } = t;
  renderDiscountBox(t);

  // Sin preventa el carrito funciona exactamente igual que siempre.
  document.getElementById("cartCount").textContent = count;
  document.getElementById("cartTotal").textContent = fmt(t.payableNow);
  document.getElementById("sendBtn").disabled = count === 0 || t.fullTotal < MIN_ORDER || !shippingCalculated;

  // El minimo se mide sobre el valor completo del pedido (preventa a precio completo).
  const minNote = document.getElementById("minOrderNote");
  if(count > 0 && t.fullTotal < MIN_ORDER){
    minNote.hidden = false;
    minNote.textContent = `Te faltan ${fmt(MIN_ORDER - t.fullTotal)} para llegar al mínimo mayorista de ${fmt(MIN_ORDER)}.`
      + (t.hasPre ? " Los productos en preventa cuentan por su precio completo." : "");
  } else {
    minNote.hidden = true;
  }

  document.getElementById("shippingBox").hidden = count === 0;
  document.getElementById("preventaBreakdown").hidden = !t.hasPre;
  document.getElementById("shippingTotalLabel").textContent = t.hasPre ? "Total a pagar ahora" : "Total con envío";
  document.getElementById("shippingRestRow").hidden = !t.hasPre;
  document.getElementById("shippingRest").textContent = fmt(t.rest);
  if(shippingCalculated){
    document.getElementById("shippingGrandTotal").textContent = fmt(t.payableNow + SHIPPING_COST);
  }

  const list = document.getElementById("cartList");
  if(ids.length === 0){
    list.innerHTML = `<div class="comanda-empty">Todavía no agregaste productos. Elegí cantidades arriba y volvé acá para revisar tu pedido.</div>`;
    return;
  }
  list.innerHTML = "";
  ids.forEach(id=>{
    const it = findItem(id);
    const qty = cart[id];
    const pre = isPre(it);
    const line = it.price * qty;
    // Con codigo de descuento, la mitad de la preventa se calcula sobre el precio ya descontado.
    const half = t.ratio === 1 ? line/2 : Math.round(line * t.ratio / 2);
    const row = document.createElement("div");
    row.className = "comanda-item";
    row.innerHTML = `
      <div class="ci-name">${it.name}${pre ? '<span class="ci-preventa-tag">Preventa</span>' : ''}<small>${it.size}</small></div>
      <div class="ci-qty">×${qty}</div>
      <div class="ci-price">${fmt(pre ? half : line)}${pre ? `<span class="ci-preventa-detail">Falta abonar ${fmt(half)}</span>` : ''}</div>
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
  syncCardsFor(id, 0);
  renderCart();
});

// codigo de descuento: se valida en la funcion de Netlify
const discountInput = document.getElementById("discountInput");
const discountApplyBtn = document.getElementById("discountApplyBtn");

const DISCOUNT_ERRORS = {
  invalido: "Ese código no existe. Revisá que esté bien escrito.",
  inactivo: "Ese código ya no está activo.",
  vencido: "Ese código ya venció."
};

async function applyDiscountCode(){
  const codigo = discountInput.value.trim();
  if(!codigo){ setDiscountMsg("Ingresá un código."); return; }
  discountApplyBtn.disabled = true;
  setDiscountMsg("Validando código…");
  try{
    const res = await fetch("/.netlify/functions/descuento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, subtotal: cartTotals().fullTotal })
    });
    const data = await res.json().catch(()=>null);
    if(!res.ok || !data) throw new Error("respuesta invalida");
    if(data.ok){
      discount = { codigo: data.codigo, tipo: data.tipo, valor: data.valor, vence: data.vence || null, compra_minima: data.compra_minima || null };
      discountInput.value = "";
      setDiscountMsg("");
    } else if(data.motivo === "minimo"){
      setDiscountMsg(`Ese código se puede usar en pedidos de al menos ${fmt(data.compra_minima)}.`);
    } else {
      setDiscountMsg(DISCOUNT_ERRORS[data.motivo] || DISCOUNT_ERRORS.invalido);
    }
  }catch(err){
    setDiscountMsg("No pudimos validar el código. Probá de nuevo en un rato; el pedido se puede enviar igual, sin descuento.");
  }finally{
    discountApplyBtn.disabled = false;
    renderCart();
  }
}

discountApplyBtn.addEventListener("click", applyDiscountCode);
discountInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); applyDiscountCode(); } });
discountInput.addEventListener("input", ()=>setDiscountMsg(""));
document.getElementById("discountRemoveBtn").addEventListener("click", ()=>{
  discount = null;
  setDiscountMsg("");
  renderCart();
});

// paso de envio: se habilita "Calcular envio" cuando estan los 3 campos
const shipAddress = document.getElementById("shipAddress");
const shipProvince = document.getElementById("shipProvince");
const shipZip = document.getElementById("shipZip");
const shippingCalcBtn = document.getElementById("shippingCalcBtn");
const shippingResult = document.getElementById("shippingResult");

function shippingFieldsFilled(){
  return shipAddress.value.trim().length >= 5
    && shipProvince.value !== ""
    && shipZip.value.trim().length >= 4;
}

function resetShippingCalc(){
  if(!shippingCalculated) return;
  shippingCalculated = false;
  shippingResult.hidden = true;
  renderCart();
}

[shipAddress, shipProvince, shipZip].forEach(el=>{
  el.addEventListener("input", ()=>{
    shippingCalcBtn.disabled = !shippingFieldsFilled();
    resetShippingCalc();
  });
  el.addEventListener("change", ()=>{
    shippingCalcBtn.disabled = !shippingFieldsFilled();
    resetShippingCalc();
  });
});

shippingCalcBtn.addEventListener("click", ()=>{
  if(!shippingFieldsFilled()) return;
  shippingCalculated = true;
  document.getElementById("shippingCost").textContent = fmt(SHIPPING_COST);
  shippingResult.hidden = false;
  renderCart();
});

// toggle comanda open/close
const comandaInner = document.getElementById("comandaInner");
document.getElementById("comandaTab").addEventListener("click", ()=>{
  const isOpen = comandaInner.classList.toggle("open");
  document.getElementById("whatsappFab").classList.toggle("fab-hidden", isOpen);

  if(isOpen && typeof fbq === "function"){
    const t = cartTotals();
    if(t.ids.length > 0){
      fbq("track", "InitiateCheckout", {
        content_ids: t.ids,
        value: t.payableNow,
        currency: "ARS",
        num_items: t.count
      });
    }
  }
});

document.getElementById("sendBtn").addEventListener("click", ()=>{
  const t = cartTotals();
  const ids = t.ids;
  if(ids.length === 0 || !shippingCalculated) return;
  // Si el codigo vencio mientras armaba el pedido, se saca y se le avisa (hay que volver a enviar).
  if(discountExpired(discount)){ renderCart(); return; }

  let msg = "Hola! Quiero hacer este pedido a jeong:\n\n";

  if(!t.hasPre){
    // Pedido sin preventa: mismo mensaje de siempre.
    ids.forEach(id=>{
      const it = findItem(id);
      const qty = cart[id];
      msg += `• ${qty}x ${it.name} (${it.size}) — ${fmt(it.price*qty)}\n`;
    });
    msg += `\nSubtotal productos: ${fmt(t.fullTotal)}`;
    if(t.discount) msg += `\nDescuento (código ${discount.codigo}): −${fmt(t.discount)}`;
    msg += `\nEnvío (Andreani): ${fmt(SHIPPING_COST)}`;
    msg += `\nTotal con envío: ${fmt(t.stock + SHIPPING_COST)}`;
  } else {
    const stockIds = ids.filter(id => !isPre(findItem(id)));
    const preIds = ids.filter(id => isPre(findItem(id)));
    if(stockIds.length){
      msg += "CON STOCK:\n";
      stockIds.forEach(id=>{
        const it = findItem(id);
        msg += `• ${cart[id]}x ${it.name} (${it.size}) — ${fmt(it.price*cart[id])}\n`;
      });
      msg += "\n";
    }
    msg += `PREVENTA (llega a partir del ${preventaDateLabel()}):\n`;
    preIds.forEach(id=>{
      const it = findItem(id);
      const line = it.price*cart[id];
      const half = t.ratio === 1 ? line/2 : Math.round(line * t.ratio / 2);
      msg += `• ${cart[id]}x ${it.name} (${it.size}) — ${fmt(line)} (hoy: ${fmt(half)} · falta abonar: ${fmt(half)})\n`;
    });
    if(t.discount){
      msg += `\nSubtotal sin descuento: ${fmt(t.fullTotal)}`;
      msg += `\nDescuento (código ${discount.codigo}): −${fmt(t.discount)}`;
      msg += `\nTotal del pedido con descuento: ${fmt(t.netTotal)} (lo de hoy y lo restante ya lo incluyen)`;
    }
    msg += `\nEnvío (Andreani): ${fmt(SHIPPING_COST)}`;
    msg += `\n\nTOTAL A PAGAR AHORA: ${fmt(t.payableNow + SHIPPING_COST)}`;
    msg += `\nTOTAL RESTANTE (a pagar al recibir): ${fmt(t.rest)}`;
  }
  msg += `\n\nDirección de envío:`;
  msg += `\n${shipAddress.value.trim()}`;
  msg += `\n${shipProvince.value} (CP ${shipZip.value.trim()})`;

  if(typeof fbq === "function"){
    fbq("track", "Lead", {
      content_ids: ids,
      value: t.payableNow + SHIPPING_COST,
      currency: "ARS"
    });
  }

  const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
  window.open(url, "_blank");
});

document.getElementById("metaProducts").textContent = totalProducts();
document.getElementById("metaCats").textContent = SECTIONS.length;
buildNav();
buildSections();
initSearch();
initBanner();

function initBanner(){
  const track = document.getElementById("bannerTrack");
  const dotsWrap = document.getElementById("bannerDots");
  const n = track.children.length;
  const dots = [];
  let current = 0;
  let timer = null;
  let autoScrolling = false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setActive(i){
    current = i;
    dots.forEach((d,k)=>d.classList.toggle("active", k===i));
  }

  function goTo(i){
    autoScrolling = true;
    setActive(i);
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    setTimeout(()=>{ autoScrolling = false; }, 700);
  }

  function stop(){ clearInterval(timer); timer = null; }
  function start(){
    if(reduceMotion || n < 2) return;
    stop();
    timer = setInterval(()=>goTo((current + 1) % n), 5000);
  }

  for(let i=0; i<n; i++){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "banner-dot";
    b.setAttribute("aria-label", "Ir a la imagen " + (i+1));
    b.addEventListener("click", ()=>{ goTo(i); start(); });
    dotsWrap.appendChild(b);
    dots.push(b);
  }

  track.addEventListener("scroll", ()=>{
    if(autoScrolling) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if(i !== current) setActive(i);
  }, { passive: true });

  const banner = document.getElementById("banner");
  banner.addEventListener("pointerenter", stop);
  banner.addEventListener("pointerleave", start);
  track.addEventListener("touchstart", stop, { passive: true });
  track.addEventListener("touchend", start, { passive: true });

  setActive(0);
  start();
}

function normalizeText(s){
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
}

function initSearch(){
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClear");

  input.addEventListener("input", ()=>{
    clearBtn.hidden = input.value.length === 0;
    applySearch(input.value);
  });

  clearBtn.addEventListener("click", ()=>{
    input.value = "";
    clearBtn.hidden = true;
    applySearch("");
    input.focus();
  });
}

function applySearch(rawQuery){
  const q = normalizeText(rawQuery.trim());
  let anyMatch = false;

  SECTIONS.forEach(s=>{
    let visibleInCat = 0;
    s.items.forEach(it=>{
      const haystack = normalizeText(it.name + " " + (it.benefit || ""));
      const match = q === "" || haystack.includes(q);
      const card = document.getElementById(cardDomId(s, it));
      if(card) card.style.display = match ? "" : "none";
      if(match) visibleInCat++;
    });

    const sec = document.getElementById("sec-"+s.n);
    if(sec){
      sec.style.display = visibleInCat === 0 ? "none" : "";
      const countEl = sec.querySelector(".section-count");
      if(countEl){
        countEl.textContent = q === ""
          ? s.items.length + (s.items.length === 1 ? " producto" : " productos")
          : visibleInCat + (visibleInCat === 1 ? " resultado" : " resultados");
      }
    }
    if(visibleInCat > 0) anyMatch = true;
  });

  document.getElementById("searchEmpty").hidden = anyMatch || q === "";
}
renderCart();

// scroll-spy for nav active state
const sections = SECTIONS.map(s=>document.getElementById("sec-"+s.n));
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

  document.getElementById("panelStepperRow").hidden = !!it.soldOut;
  const restockNote = document.getElementById("panelRestockNote");
  restockNote.hidden = !it.soldOut;
  if(it.soldOut) restockNote.textContent = it.restockDate ? ("Agotado — " + restockLabel(it)) : "Agotado";

  const lastUnitsEl = document.getElementById("panelLastUnits");
  lastUnitsEl.hidden = !tagLabel(it);
  if(tagLabel(it)) lastUnitsEl.textContent = tagLabel(it);

  const preventaNote = document.getElementById("panelPreventaNote");
  preventaNote.hidden = !isPre(it);
  if(isPre(it)) preventaNote.textContent = `Este producto es preventa — se abona el 50% ahora y el 50% restante al recibirlo, a partir del ${preventaDateLabel()}.`;

  panelOverlay.classList.add("open");
  productPanel.classList.add("open");
  document.body.style.overflow = "hidden";
  history.pushState({ jeongPanel: true }, "");

  if(typeof fbq === "function"){
    fbq("track", "ViewContent", {
      content_ids: [id],
      content_name: it.name,
      content_type: "product",
      value: it.price,
      currency: "ARS"
    });
  }
}

function closePanel(){
  if(!productPanel.classList.contains("open")) return;
  // if we pushed a history entry for this panel, go back to consume it —
  // that fires popstate, which actually hides the panel (see below).
  // This keeps the phone's back button in sync with the panel state.
  if(history.state && history.state.jeongPanel){
    history.back();
  } else {
    hidePanel();
  }
}

function hidePanel(){
  panelOverlay.classList.remove("open");
  productPanel.classList.remove("open");
  document.body.style.overflow = "";
  panelItemId = null;
}

window.addEventListener("popstate", hidePanel);

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
