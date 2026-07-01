(function(){
  const RETURN_NUMBERS = Array.from({ length: 25 }, (_, i) => i + 1);

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

  function productUnit(id){
    const p = products.find(x => String(x.id) === String(id));
    return p ? unitOf(p) : '个';
  }

  function getAfterSaleToggles(id){
    return Array.from(document.querySelectorAll('[data-after-sales-toggle]')).filter(btn=>btn.dataset.afterSalesToggle === String(id));
  }

  function getAfterSalePanels(id){
    return Array.from(document.querySelectorAll('[data-after-sales-panel]')).filter(panel=>panel.dataset.afterSalesPanel === String(id));
  }

  function getAfterSalePanel(id){
    return getAfterSalePanels(id)[0] || null;
  }

  function syncAfterSaleControls(id){
    const qty = getAfterSaleQty(id);
    getAfterSaleToggles(id).forEach(btn=>{
      btn.textContent = qty > 0 ? `售后 ${qty}` : '售后';
      btn.classList.toggle('has-value', qty > 0);
    });
    getAfterSalePanels(id).forEach(panel=>{
      const unit = productUnit(id);
      const current = panel.querySelector('.after-sales-current');
      if(current) current.textContent = `当前收回：${qty}${unit}`;
      panel.querySelectorAll('[data-after-sales-qty]').forEach(btn=>{
        btn.classList.toggle('active', Number(btn.dataset.afterSalesQty) === qty);
      });
    });
  }

  function closeOtherPanels(id){
    document.querySelectorAll('.after-sales-panel').forEach(panel=>{
      if(panel.dataset.afterSalesPanel !== String(id)) panel.classList.add('hide');
    });
  }

  function toggleAfterSalePanel(id){
    const panel = getAfterSalePanel(id);
    if(!panel) return;
    closeOtherPanels(id);
    panel.classList.toggle('hide');
    syncAfterSaleControls(id);
  }

  function buildAfterSalePanel(id){
    const unit = productUnit(id);
    return `<div class="after-sales-panel hide" data-after-sales-panel="${esc(id)}">
      <div class="after-sales-head"><span class="after-sales-title">收回数量（可售）</span><span class="after-sales-current">当前收回：${getAfterSaleQty(id)}${unit}</span></div>
      <div class="after-sales-tip">只算还能卖的，过期、破损、不能二次销售的不要加库存。</div>
      <div class="after-sales-grid">${RETURN_NUMBERS.map(n=>`<button type="button" data-after-sales-qty="${n}">${n}</button>`).join('')}</div>
      <button type="button" class="after-sales-clear" data-after-sales-clear="1">清零</button>
    </div>`;
  }

  function bindAfterSalesControls(){
    if(STATE !== 'ORDER' || !orderData?.items) return;
    const looseLines = document.querySelectorAll('#list .item .sell-line:not([data-after-sales-bound])');
    looseLines.forEach(line=>{
      const tag = line.querySelector('.sell-tag')?.textContent?.trim();
      if(tag !== '散') return;
      const id = parseProductIdFromLooseLine(line);
      if(!id || !orderData.items[id]) return;
      line.dataset.afterSalesBound = '1';

      const pricePicker = line.querySelector('select.price-picker');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'after-sales-toggle';
      btn.dataset.afterSalesToggle = String(id);
      btn.addEventListener('click', ()=>toggleAfterSalePanel(id));
      pricePicker ? pricePicker.insertAdjacentElement('afterend', btn) : line.appendChild(btn);

      line.insertAdjacentHTML('afterend', buildAfterSalePanel(id));
      const panel = line.nextElementSibling;
      panel?.addEventListener('click', event=>{
        const qtyBtn = event.target.closest('[data-after-sales-qty]');
        if(qtyBtn){
          setAfterSaleQty(id, qtyBtn.dataset.afterSalesQty);
          panel.classList.add('hide');
          return;
        }
        if(event.target.closest('[data-after-sales-clear]')){
          setAfterSaleQty(id, 0);
          panel.classList.add('hide');
        }
      });
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
          if(String(it.sale_unit||'') !== '售后') return;
          const id = String(it.barcode||'');
          if(!orderData.items[id]) return;
          orderData.items[id].afterSaleQty = afterSaleQtyForItem(orderData.items[id]) + Math.abs(Number(it.qty||0));
          restored = true;
        });
        if(restored) renderOrder();
      }catch(err){
        console.warn('售后数量恢复失败', err);
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
      alert('⚠️ 空白单据无法提交！');
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
          itemsPayload.push({barcode:String(id),product_name:String(p.product_name),qty:Number(qty*packSize(p)),unit_price:price,amount:Number(amount.toFixed(2)),sale_unit:'整',sale_qty:qty,sale_unit_price:price});
        }
        if(Number(it.looseQty||0)>0){
          const qty=Number(it.looseQty),price=Number(it.loosePrice||0),amount=qty*price;
          total+=amount;
          itemsPayload.push({barcode:String(id),product_name:String(p.product_name),qty:Number(qty),unit_price:price,amount:Number(amount.toFixed(2)),sale_unit:'散',sale_qty:qty,sale_unit_price:price});
        }
        if(returnQty > 0){
          itemsPayload.push({barcode:String(id),product_name:String(p.product_name),qty:-returnQty,unit_price:0,amount:0,sale_unit:'售后',sale_qty:0,sale_unit_price:0});
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
      alert('✅ 开单成功');
      orderData=null;
      openStoreHistory(currentStore.atom,currentStore.name);
    }catch(err){
      console.error(err);
      alert(`❌ 账单保存失败: ${err.message||'网络错误'}`);
      if(btn){btn.disabled=false;btn.innerText='提交账单'}
    }
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    scheduleBind();
    const list = document.getElementById('list');
    if(list) new MutationObserver(scheduleBind).observe(list,{childList:true,subtree:true});
  });
})();
