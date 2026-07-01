(function(){
  const QUICK_NUMBERS = Array.from({ length: 25 }, (_, i) => i + 1);
  const STATE = {
    select: null,
    trigger: null,
    productId: '',
    key: '',
    max: 100
  };

  function parseQtySelect(select){
    const code = select.getAttribute('onchange') || '';
    const match = code.match(/changeQty\('([^']+)'\s*,\s*'([^']+)'\s*,\s*this\.value\)/);
    if(!match) return null;
    const options = Array.from(select.options || []);
    const max = options.reduce((m,opt)=>Math.max(m, Number(opt.value) || 0), 0) || 100;
    return { id: match[1], key: match[2], max };
  }

  function unitNameForSelect(select){
    return select.closest('.sell-line')?.querySelector('.sell-unit')?.textContent?.trim() || '';
  }

  function productNameForSelect(select){
    return select.closest('.item')?.querySelector('.prod-name')?.textContent?.trim() || '商品';
  }

  function labelForKey(key){
    return key === 'wholeQty' ? '整' : '散';
  }

  function normalizeQty(value){
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? String(n) : '0';
  }

  function syncTrigger(trigger, select){
    const val = normalizeQty(select.value);
    trigger.textContent = val;
    trigger.classList.toggle('has-value', Number(val) > 0);
  }

  function ensurePopup(){
    if(document.getElementById('qtyPopupMask')) return;
    const mask = document.createElement('div');
    mask.id = 'qtyPopupMask';
    mask.className = 'qty-popup-mask hide';
    mask.innerHTML = `
      <div class="qty-popup-sheet" role="dialog" aria-modal="true" aria-labelledby="qtyPopupTitle">
        <div class="qty-popup-head">
          <div class="qty-popup-title-wrap">
            <div id="qtyPopupTitle" class="qty-popup-title">选择数量</div>
          </div>
          <button type="button" class="qty-popup-close" data-qty-action="close" aria-label="关闭">×</button>
        </div>
        <div id="qtyPopupCurrent" class="qty-popup-current">当前：0</div>
        <div id="qtyPopupGrid" class="qty-popup-grid qty-popup-grid-5"></div>
        <button type="button" class="qty-popup-clear" data-qty-action="clear">清零</button>
      </div>`;
    mask.addEventListener('click', handlePopupClick);
    document.addEventListener('keydown', handlePopupKeydown);
    document.body.appendChild(mask);
  }

  function renderGrid(){
    const grid = document.getElementById('qtyPopupGrid');
    if(!grid) return;
    const current = Number(STATE.select?.value || 0);
    grid.innerHTML = QUICK_NUMBERS.map(n=>{
      const disabled = n > STATE.max ? ' disabled' : '';
      const active = n === current ? ' active' : '';
      return `<button type="button" class="qty-popup-number${active}" data-qty-value="${n}"${disabled}>${n}</button>`;
    }).join('');
  }

  function applyQty(value){
    if(!STATE.select) return closePopup();
    const n = Math.max(0, Math.min(STATE.max, parseInt(value, 10) || 0));
    STATE.select.value = String(n);
    if(typeof window.changeQty === 'function'){
      window.changeQty(STATE.productId, STATE.key, n);
    }else{
      STATE.select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if(STATE.trigger) syncTrigger(STATE.trigger, STATE.select);
    closePopup();
  }

  function openPopup(select, trigger, meta){
    ensurePopup();
    STATE.select = select;
    STATE.trigger = trigger;
    STATE.productId = meta.id;
    STATE.key = meta.key;
    STATE.max = meta.max;

    const unit = unitNameForSelect(select);
    const title = `${productNameForSelect(select)} · ${labelForKey(meta.key)}`;
    document.getElementById('qtyPopupTitle').textContent = title;
    document.getElementById('qtyPopupCurrent').textContent = `当前：${normalizeQty(select.value)}${unit}`;
    renderGrid();

    document.body.classList.add('qty-popup-open');
    document.getElementById('qtyPopupMask').classList.remove('hide');
  }

  function closePopup(){
    document.body.classList.remove('qty-popup-open');
    document.getElementById('qtyPopupMask')?.classList.add('hide');
    STATE.select = null;
    STATE.trigger = null;
  }

  function handlePopupClick(event){
    if(event.target.id === 'qtyPopupMask') return closePopup();
    const numberBtn = event.target.closest('[data-qty-value]');
    if(numberBtn) return applyQty(numberBtn.dataset.qtyValue);
    const action = event.target.closest('[data-qty-action]')?.dataset.qtyAction;
    if(action === 'close') return closePopup();
    if(action === 'clear') return applyQty(0);
  }

  function handlePopupKeydown(event){
    if(document.getElementById('qtyPopupMask')?.classList.contains('hide')) return;
    if(event.key === 'Escape'){
      event.preventDefault();
      closePopup();
      return;
    }
    if(event.key === '0'){
      event.preventDefault();
      applyQty(0);
      return;
    }
    if(/^\d$/.test(event.key)){
      event.preventDefault();
      applyQty(event.key);
    }
  }

  function bindQtyPopup(){
    const selects = document.querySelectorAll('#list .sell-line select.ios-picker:not(.price-picker):not([data-qty-popup-bound])');
    selects.forEach(select=>{
      const meta = parseQtySelect(select);
      if(!meta) return;
      select.dataset.qtyPopupBound = '1';
      select.classList.add('qty-native-hidden');

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'qty-popup-trigger';
      trigger.setAttribute('aria-label', '选择数量');
      trigger.addEventListener('click', ()=>openPopup(select, trigger, meta));
      select.insertAdjacentElement('afterend', trigger);
      syncTrigger(trigger, select);
    });
  }

  function scheduleBind(){
    if(scheduleBind.raf) cancelAnimationFrame(scheduleBind.raf);
    scheduleBind.raf = requestAnimationFrame(bindQtyPopup);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    ensurePopup();
    scheduleBind();
    const list = document.getElementById('list');
    if(list){
      new MutationObserver(scheduleBind).observe(list, { childList: true, subtree: true });
    }
  });
})();

(function(){
  if(typeof window.validateMixBoxGroups !== 'function') return;
  window.validateMixBoxGroups = function(){
    for(const list of mixBoxGroups()){
      const qty = getMixBoxQty(list);
      const size = mixBoxSize(list);
      if(qty > 0 && size > 0 && qty % size !== 0){
        const first = list[0] || {};
        const productName = `${first.brand || ''}${first.spec || ''}`.trim() || first.product_name || '拼盒商品';
        const unit = unitOf(first);
        return `\n${productName}\n已选${qty}${unit}，必须按${size}的倍数整盒提交`;
      }
    }
    return '';
  };
})();
