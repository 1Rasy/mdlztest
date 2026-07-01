(function(){
  const STATE = {
    select: null,
    trigger: null,
    productId: '',
    key: '',
    max: 100,
    value: '0',
    firstInput: true
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
          <div>
            <div id="qtyPopupTitle" class="qty-popup-title">选择数量</div>
            <div id="qtyPopupHint" class="qty-popup-hint"></div>
          </div>
          <button type="button" class="qty-popup-close" data-qty-action="close" aria-label="关闭">×</button>
        </div>
        <div id="qtyPopupDisplay" class="qty-popup-display">0</div>
        <div id="qtyPopupNotice" class="qty-popup-notice"></div>
        <div class="qty-popup-grid">
          ${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-qty-num="${n}">${n}</button>`).join('')}
          <button type="button" class="qty-popup-secondary" data-qty-action="clear">清零</button>
          <button type="button" data-qty-num="0">0</button>
          <button type="button" class="qty-popup-secondary" data-qty-action="backspace">删除</button>
        </div>
        <button type="button" class="qty-popup-confirm" data-qty-action="confirm">确定</button>
      </div>`;
    mask.addEventListener('click', handlePopupClick);
    document.addEventListener('keydown', handlePopupKeydown);
    document.body.appendChild(mask);
  }

  function updatePopupText(notice=''){
    const display = document.getElementById('qtyPopupDisplay');
    const noticeBox = document.getElementById('qtyPopupNotice');
    if(display) display.textContent = normalizeQty(STATE.value);
    if(noticeBox) noticeBox.textContent = notice;
  }

  function setValue(nextValue){
    let n = parseInt(nextValue, 10);
    if(!Number.isFinite(n) || n < 0) n = 0;
    let notice = '';
    if(n > STATE.max){
      n = STATE.max;
      notice = `最多 ${STATE.max}`;
    }
    STATE.value = String(n);
    updatePopupText(notice);
  }

  function inputDigit(digit){
    const base = STATE.firstInput ? '' : normalizeQty(STATE.value);
    STATE.firstInput = false;
    setValue((base === '0' ? '' : base) + String(digit));
  }

  function backspace(){
    const value = normalizeQty(STATE.value);
    STATE.firstInput = false;
    setValue(value.length > 1 ? value.slice(0, -1) : '0');
  }

  function applyQty(){
    if(!STATE.select) return closePopup();
    const value = Math.max(0, Math.min(STATE.max, parseInt(STATE.value, 10) || 0));
    STATE.select.value = String(value);
    if(typeof window.changeQty === 'function'){
      window.changeQty(STATE.productId, STATE.key, value);
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
    STATE.value = normalizeQty(select.value);
    STATE.firstInput = true;

    const unit = unitNameForSelect(select);
    const title = `${productNameForSelect(select)} · ${labelForKey(meta.key)}`;
    document.getElementById('qtyPopupTitle').textContent = title;
    document.getElementById('qtyPopupHint').textContent = `点数字输入数量，最多 ${meta.max}${unit}`;
    updatePopupText('');

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
    const num = event.target.closest('[data-qty-num]');
    if(num) return inputDigit(num.dataset.qtyNum);
    const action = event.target.closest('[data-qty-action]')?.dataset.qtyAction;
    if(action === 'close') return closePopup();
    if(action === 'clear') return setValue('0');
    if(action === 'backspace') return backspace();
    if(action === 'confirm') return applyQty();
  }

  function handlePopupKeydown(event){
    if(document.getElementById('qtyPopupMask')?.classList.contains('hide')) return;
    if(/^\d$/.test(event.key)){event.preventDefault();inputDigit(event.key)}
    else if(event.key === 'Backspace'){event.preventDefault();backspace()}
    else if(event.key === 'Enter'){event.preventDefault();applyQty()}
    else if(event.key === 'Escape'){event.preventDefault();closePopup()}
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
