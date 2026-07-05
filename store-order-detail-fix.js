(function(){
  function detailMoney(value){
    return typeof money === 'function' ? money(value) : Number(value || 0).toFixed(2);
  }

  function isMixSaleUnit(unit){
    return String(unit || '').trim() === '拼盒';
  }

  function isWholeSaleUnit(unit){
    return String(unit || '').trim() === '整';
  }

  function addPriceGroup(map, qty, price){
    const q = Number(qty) || 0;
    if(!q) return;
    const p = Number(price) || 0;
    const key = p.toFixed(4);
    const prev = map.get(key) || { qty:0, price:p };
    prev.qty += q;
    map.set(key, prev);
  }

  function formatQtyNumber(value){
    const n = Number(value) || 0;
    if(Number.isInteger(n)) return String(n);
    return Number(n.toFixed(2)).toString();
  }

  function priceGroupParts(map, unitText){
    if(!(map instanceof Map) || !map.size) return [];
    return Array.from(map.values()).map(group=>`${formatQtyNumber(group.qty)}${unitText} × ${detailMoney(group.price)}`);
  }

  orderDetailPartsText = function(r){
    const parts = [];
    if(r.looseQty) parts.push(`${formatQtyNumber(r.looseQty)}散 × ${detailMoney(r.loosePrice)}`);
    if(r.wholeQty) parts.push(`${formatQtyNumber(r.wholeQty)}整 × ${detailMoney(r.wholePrice)}`);
    parts.push(...priceGroupParts(r.mixBoxGroups, '盒'));
    parts.push(...priceGroupParts(r.mixLooseGroups, '散'));
    return parts.join(' + ') || '-';
  };

  orderDetailFlavorHtml = function(r){
    if(!(r.flavorRows instanceof Map) || !r.flavorRows.size) return '';
    return `<div class="order-detail-flavors">${Array.from(r.flavorRows.values()).map(f=>`<div class="order-detail-flavor"><span>${esc(f.flavor)}</span><span>${orderDetailPartsText(f)}</span></div>`).join('')}</div>`;
  };

  aggregateDetailItems = function(items){
    const m = new Map();
    (items || []).forEach(it=>{
      const bc = String(it.barcode || '');
      const p = products.find(x=>String(x.id)===bc) || products.find(x=>String(x.barcode)===bc) || {id:bc,barcode:bc,product_name:it.product_name||bc,unit:'个',pcs_per_case:1,pcs_per_box:0,spec:'',flavor:''};
      const key = orderDetailGroupKey(p,it);
      const flavor = orderDetailFlavorLabel(p,it);
      if(!m.has(key)){
        m.set(key,{
          barcode:bc,
          barcodes:new Set(),
          product:p,
          product_name:orderDetailSpecLabel(p,it),
          flavorRows:new Map(),
          wholeQty:0,
          wholePrice:0,
          looseQty:0,
          loosePrice:0,
          mixBoxGroups:new Map(),
          mixLooseGroups:new Map(),
          amount:0,
          stockQty:0
        });
      }
      const r = m.get(key);
      r.barcodes.add(bc);
      if(!r.flavorRows.has(flavor)){
        r.flavorRows.set(flavor,{
          flavor,
          wholeQty:0,
          wholePrice:0,
          looseQty:0,
          loosePrice:0,
          mixBoxGroups:new Map(),
          mixLooseGroups:new Map(),
          amount:0
        });
      }
      const f = r.flavorRows.get(flavor);
      const su = String(it.sale_unit || '散').trim();
      const sq = Number(it.sale_qty ?? it.qty ?? 0) || 0;
      const amount = Number(it.amount || 0) || 0;
      const saleUnitPrice = Number(it.sale_unit_price ?? it.unit_price ?? 0) || 0;
      const unitPrice = Number(it.unit_price ?? saleUnitPrice) || 0;

      if(isWholeSaleUnit(su)){
        r.wholeQty += sq;
        r.wholePrice = saleUnitPrice || unitPrice;
        f.wholeQty += sq;
        f.wholePrice = saleUnitPrice || unitPrice;
      }else if(isMixSaleUnit(su)){
        const boxSize = Number(p.pcs_per_box || 0) || 0;
        const boxQty = saleUnitPrice > 0 ? amount / saleUnitPrice : (boxSize > 0 ? sq / boxSize : 0);
        const loosePrice = sq > 0 ? amount / sq : (boxSize > 0 ? saleUnitPrice / boxSize : unitPrice);
        addPriceGroup(r.mixBoxGroups, boxQty, saleUnitPrice || amount);
        addPriceGroup(f.mixLooseGroups, sq, loosePrice);
      }else{
        r.looseQty += sq;
        r.loosePrice = saleUnitPrice || unitPrice;
        f.looseQty += sq;
        f.loosePrice = saleUnitPrice || unitPrice;
      }
      r.amount += amount;
      f.amount += amount;
      r.stockQty += Number(it.qty || 0) || 0;
    });
    return Array.from(m.values()).map(r=>({...r,barcodes:Array.from(r.barcodes)}));
  };

  function injectDetailActionStyles(){
    if(document.getElementById('spr-order-detail-action-style')) return;
    const style = document.createElement('style');
    style.id = 'spr-order-detail-action-style';
    style.textContent = `
      .detail-action-row button{height:40px!important;border-radius:999px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:14px!important;font-weight:800!important;line-height:1!important;box-shadow:none!important;}
      .detail-action-row .delivery-note-btn-primary{background:var(--primary)!important;color:#fff!important;border:1px solid var(--primary)!important;}
      .detail-secondary-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;align-items:center!important;}
      .detail-secondary-actions .detail-action-secondary{background:#fff!important;color:var(--primary)!important;border:1px solid #d8cdda!important;padding:0 14px!important;margin:0!important;}
      .detail-secondary-actions .detail-action-danger{background:#fff!important;color:var(--danger)!important;border:1px solid #f3caca!important;padding:0 14px!important;margin:0!important;}
      .detail-secondary-actions .detail-action-danger:active,.detail-secondary-actions .detail-action-secondary:active{transform:scale(.98);background:#faf9fa!important;}
    `;
    document.head.appendChild(style);
  }

  function setButtonText(btn, text){
    if(btn && btn.textContent !== text) btn.textContent = text;
  }

  function removeInlineStyle(btn){
    if(btn && btn.hasAttribute('style')) btn.removeAttribute('style');
  }

  function ensureClass(btn, className){
    if(btn && !btn.classList.contains(className)) btn.classList.add(className);
  }

  function normalizeDetailButtons(){
    if(typeof STATE !== 'undefined' && STATE !== 'DETAIL') return;
    const root = document.getElementById('list');
    if(!root) return;
    const delivery = root.querySelector('.detail-delivery-action');
    if(delivery){
      setButtonText(delivery, '生成单据');
      removeInlineStyle(delivery);
    }
    const edit = Array.from(root.querySelectorAll('.detail-secondary-actions button')).find(btn=>String(btn.getAttribute('onclick') || '').includes('editExistingOrder'));
    if(edit){
      setButtonText(edit, '修改');
      removeInlineStyle(edit);
      ensureClass(edit, 'detail-action-secondary');
    }
    const del = root.querySelector('.detail-secondary-actions .detail-danger-action') || Array.from(root.querySelectorAll('.detail-secondary-actions button')).find(btn=>String(btn.getAttribute('onclick') || '').includes('deleteExistingOrder'));
    if(del){
      setButtonText(del, '删除');
      removeInlineStyle(del);
      ensureClass(del, 'detail-action-danger');
    }
  }

  injectDetailActionStyles();
  document.addEventListener('DOMContentLoaded',()=>{
    normalizeDetailButtons();
    const list = document.getElementById('list');
    if(list) new MutationObserver(normalizeDetailButtons).observe(list,{childList:true,subtree:true});
  });
})();
