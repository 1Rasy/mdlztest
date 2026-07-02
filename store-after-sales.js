(function(){
  const AFTER_SALE_UNIT = '\u552e\u540e';
  const AFTER_SALE_LABEL = '\u552e\u540e';
  const AFTER_SALE_PANEL_LABEL = '\u552e\u540e\u6570';
  const AFTER_SALE_NOTE = '\u53ea\u7b97\u80fd\u5356\u7684\uff0c\u6536\u56de\u589e\u52a0\u5e93\u5b58';

  function makeAfterSaleOptions(current){
    const cur = normalizeReturnQty(current);
    let html = '';
    for(let i=0;i<=100;i++) html += `<option value="${i}" ${i===cur?'selected':''}>${i}</option>`;
    return html;
  }

  function parseProductIdFromLooseLine(line){
    const qtySelect = line?.querySelector('select.ios-picker:not(.price-picker)');
    const code = qtySelect?.getAttribute('onchange') || '';
    const match = code.match(/changeQty\('([^']+)'\s*,\s*'looseQty'/);
    return match ? match[1] : '';
  }

  function normalizeReturnQty(value){
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function isAfterSaleUnit(unit){
    const text = String(unit || '');
    return text === AFTER_SALE_UNIT || text.includes(AFTER_SALE_UNIT);
  }

  function getAfterSaleQty(id){
    const it = orderData?.items?.[id];
    return normalizeReturnQty(it?.afterSaleQty);
  }

  function setAfterSaleQty(id, qty){
    const it = orderData?.items?.[id];
    if(!it) return;
    it.afterSaleQty = normalizeReturnQty(qty);
    syncAfterSaleControls(id);
    if(typeof calculateLiveOrderAmounts === 'function') calculateLiveOrderAmounts();
  }

  function getAfterSaleWraps(id){
    return Array.from(document.querySelectorAll('[data-after-sales-wrap]')).filter(wrap=>wrap.dataset.afterSalesWrap === String(id));
  }

  function getAfterSalePanels(id){
    return Array.from(document.querySelectorAll('[data-after-sales-panel]')).filter(panel=>panel.dataset.afterSalesPanel === String(id));
  }

  function syncAfterSaleControls(id){
    const qty = getAfterSaleQty(id);
    getAfterSaleWraps(id).forEach(wrap=>{
      const btn = wrap.querySelector('[data-after-sales-toggle]');
      if(btn){
        btn.textContent = qty > 0 ? `${AFTER_SALE_LABEL}${qty}` : AFTER_SALE_LABEL;
        btn.classList.toggle('has-value', qty > 0);
      }
      wrap.classList.toggle('has-value', qty > 0);
    });
    getAfterSalePanels(id).forEach(panel=>{
      const picker = panel.querySelector('[data-after-sales-select]');
      if(picker) picker.value = String(qty);
      panel.classList.toggle('has-value', qty > 0);
    });
  }

  function closeOtherPanels(id){
    document.querySelectorAll('[data-after-sales-wrap]').forEach(wrap=>{
      if(wrap.dataset.afterSalesWrap !== String(id)) wrap.classList.remove('open');
    });
    document.querySelectorAll('[data-after-sales-panel]').forEach(panel=>{
      if(panel.dataset.afterSalesPanel !== String(id)) panel.classList.remove('open');
    });
  }

  function toggleAfterSalePanel(id){
    const wrap = getAfterSaleWraps(id)[0];
    const panel = getAfterSalePanels(id)[0];
    if(!wrap || !panel) return;
    const nextOpen = !panel.classList.contains('open');
    closeOtherPanels(id);
    wrap.classList.toggle('open', nextOpen);
    panel.classList.toggle('open', nextOpen);
    syncAfterSaleControls(id);
  }

  function buildAfterSaleInline(id){
    return `<span class="after-sales-wrap" data-after-sales-wrap="${esc(id)}">
      <button type="button" class="after-sales-toggle" data-after-sales-toggle="${esc(id)}">${AFTER_SALE_LABEL}</button>
    </span>`;
  }

  function buildAfterSalePanel(id){
    return `<div class="after-sales-panel" data-after-sales-panel="${esc(id)}">
      <span class="after-sales-panel-label">${AFTER_SALE_PANEL_LABEL}</span>
      <select class="ios-picker after-sales-picker" data-after-sales-select="${esc(id)}">${makeAfterSaleOptions(getAfterSaleQty(id))}</select>
      <span class="after-sales-note">${AFTER_SALE_NOTE}</span>
    </div>`;
  }

  function bindAfterSalesControls(){
    if(STATE !== 'ORDER' || !orderData?.items) return;
    const looseLines = document.querySelectorAll('#list .item .sell-line:not([data-after-sales-bound])');
    looseLines.forEach(line=>{
      const tag = line.querySelector('.sell-tag')?.textContent?.trim();
      if(tag !== '\u6563') return;
      const id = parseProductIdFromLooseLine(line);
      if(!id || !orderData.items[id]) return;
      line.dataset.afterSalesBound = '1';
      line.classList.add('after-sales-line');

      line.insertAdjacentHTML('beforeend', buildAfterSaleInline(id));
      line.insertAdjacentHTML('afterend', buildAfterSalePanel(id));
      const wrap = getAfterSaleWraps(id)[0];
      const panel = getAfterSalePanels(id)[0];
      const btn = wrap?.querySelector('[data-after-sales-toggle]');
      const picker = panel?.querySelector('[data-after-sales-select]');
      btn?.addEventListener('click', ()=>toggleAfterSalePanel(id));
      picker?.addEventListener('change', event=>setAfterSaleQty(id, event.target.value));
      syncAfterSaleControls(id);
    });
  }

  function scheduleBind(){
    if(scheduleBind.raf) cancelAnimationFrame(scheduleBind.raf);
    scheduleBind.raf = requestAnimationFrame(bindAfterSalesControls);
  }

  function afterSaleQtyForItem(it){
    return normalizeReturnQty(it?.afterSaleQty);
  }

  const originalTemplateEditOrNew = typeof templateEditOrNew === 'function' ? templateEditOrNew : null;
  if(originalTemplateEditOrNew){
    templateEditOrNew = function(orderNo=null, orderDate=null, rawItemsEncoded=null, atom=null, name=null){
      originalTemplateEditOrNew(orderNo, orderDate, rawItemsEncoded, atom, name);
      if(!orderNo || !rawItemsEncoded || !orderData?.items) return;
      try{
        const items = JSON.parse(decodeURIComponent(rawItemsEncoded));
        let restored = false;
        items.forEach(it=>{
          if(!isAfterSaleUnit(it.sale_unit)) return;
          const id = String(it.barcode||'');
          if(!orderData.items[id]) return;
          orderData.items[id].afterSaleQty = afterSaleQtyForItem(orderData.items[id]) + Math.abs(Number(it.qty||0));
          restored = true;
        });
        if(restored) renderOrder();
      }catch(err){
        console.warn('\u552e\u540e\u6570\u91cf\u6062\u590d\u5931\u8d25', err);
      }
    };
  }

  submitOrder = async function(){
    let grand = 0;
    Object.keys(orderData.items).forEach(id=>{
      const p = products.find(x=>x.id==id);
      if(p) grand += stockQtyFromItem(p,orderData.items[id]) + afterSaleQtyForItem(orderData.items[id]);
    });
    if(grand === 0){
      alert('\u26a0\ufe0f \u7a7a\u767d\u5355\u636e\u65e0\u6cd5\u63d0\u4ea4\uff01');
      return;
    }
    const btn = document.querySelector('.float-submit');
    if(btn){btn.disabled=true;btn.innerText=LOADING_TEXT}
    try{
      const mixError = validateMixBoxGroups();
      if(mixError) throw new Error(mixError);
      let finalOrderNo = orderData.order_no;
      if(isNewStoreFlow && !finalOrderNo){
        await client.from('employee_store_assets').insert({employee_code:String(currentEmployee.code),atom_code:String(orderData.atom),store_name:String(orderData.name)});
        stores.push({atom_code:orderData.atom,store_name:orderData.name});
        stores.sort((a,b)=>a.store_name.localeCompare(b.store_name,'zh-CN'));
        isNewStoreFlow=false;
      }
      const {data:currentStocks} = await client.from('van_stocks').select('*').eq('employee_code',currentEmployee.code);
      const live = {};
      (currentStocks||[]).forEach(st=>live[st.product_barcode]=Number(st.qty)||0);
      const stockUpdates = [], itemsPayload = [];
      let total = 0;
      for(const id of Object.keys(orderData.items)){
        const p = products.find(x=>x.id==id);
        if(!p) continue;
        const it = orderData.items[id];
        const saleStockQty = stockQtyFromItem(p,it);
        const returnQty = afterSaleQtyForItem(it);
        const netStockOut = saleStockQty - returnQty;
        const oldDb = Number(orderData.oldDbItemsMap?.[id] || 0);
        const delta = netStockOut - oldDb;
        if(delta !== 0 || saleStockQty > 0 || returnQty > 0){
          stockUpdates.push({product_barcode:String(id),qty:Number(live[id]||0)-delta});
        }
        if(Number(it.wholeQty||0)>0){
          const qty=Number(it.wholeQty),price=Number(it.wholePrice||0),amount=qty*price;
          total+=amount;
          itemsPayload.push({barcode:String(id),product_name:String(p.product_name),qty:Number(qty*packSize(p)),unit_price:price,amount:Number(amount.toFixed(2)),sale_unit:'\u6574',sale_qty:qty,sale_unit_price:price});
        }
        if(Number(it.looseQty||0)>0){
          const qty=Number(it.looseQty),price=Number(it.loosePrice||0),amount=qty*price;
          total+=amount;
          itemsPayload.push({barcode:String(id),product_name:String(p.product_name),qty:Number(qty),unit_price:price,amount:Number(amount.toFixed(2)),sale_unit:'\u6563',sale_qty:qty,sale_unit_price:price});
        }
        if(returnQty > 0){
          itemsPayload.push({barcode:String(id),product_name:String(p.product_name),qty:-returnQty,unit_price:0,amount:0,sale_unit:AFTER_SALE_UNIT,sale_qty:0,sale_unit_price:0});
        }
      }
      const mixPayload = buildMixBoxPayloads();
      total += mixPayload.total;
      itemsPayload.push(...mixPayload.items);
      if(!finalOrderNo) finalOrderNo='SO'+Date.now()+Math.floor(Math.random()*1000);
      const {error} = await client.rpc('submit_sales_order_v2',{
        p_order_no:String(finalOrderNo),
        p_employee_code:String(currentEmployee.code),
        p_atom_code:String(orderData.atom),
        p_store_name:String(orderData.name),
        p_total_amount:Number(total.toFixed(2)),
        p_items:itemsPayload,
        p_stock_updates:stockUpdates
      });
      if(error) throw new Error(error.message);
      const {error:dateError} = await client.from('sales_orders').update({created_at:orderDateToCreatedAt(orderData.date)}).eq('order_no',String(finalOrderNo));
      if(dateError) throw new Error(dateError.message);
      alert('\u2705 \u5f00\u5355\u6210\u529f');
      orderData=null;
      openStoreHistory(currentStore.atom,currentStore.name);
    }catch(err){
      console.error(err);
      alert(`\u274c \u8d26\u5355\u4fdd\u5b58\u5931\u8d25: ${err.message||'\u7f51\u7edc\u9519\u8bef'}`);
      if(btn){btn.disabled=false;btn.innerText='\u63d0\u4ea4\u8d26\u5355'}
    }
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    scheduleBind();
    const list = document.getElementById('list');
    if(list) new MutationObserver(scheduleBind).observe(list,{childList:true,subtree:true});
  });
})();
