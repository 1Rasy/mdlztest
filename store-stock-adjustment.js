(function() {
  let adjustmentMode = false;
  let editingRequestId = null;
  let editMeta = null;
  let requestPanelsHtml = '';
  const adjustments = new Map();
  const stockAdjustmentApi = StockAdjustmentApi.create(client);
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
  const initialAdjust = new URLSearchParams(location.search).get('adjust') === '1';
  const originalOpenStockManagement = window.openStockManagement;
  const originalSelectBrand = window.selectBrand;
  const originalSelectSpec = window.selectSpec;

  window.openStockManagement = async function() {
    await originalOpenStockManagement();
    if (initialAdjust) await window.openStockAdjustmentMode();
  };

  window.selectBrand = function(value) {
    if (!adjustmentMode) return originalSelectBrand(value);
    currentSelectedBrand = value;
    currentSelectedSpec = getSpecsForBrand(value)[0] || '';
    renderAdjustmentProductArea();
  };

  window.selectSpec = function(value) {
    if (!adjustmentMode) return originalSelectSpec(value);
    currentSelectedSpec = value;
    renderAdjustmentProductArea();
  };

  function rows() {
    return orderedProducts(products.filter(product => (
      product.brand === currentSelectedBrand && product.spec === currentSelectedSpec
    )));
  }

  function draftFor(id) {
    return adjustments.get(String(id)) || { direction: 'plus', qty: 0 };
  }

  function signed(row) {
    return row.direction === 'minus' ? -row.qty : row.qty;
  }

  function clearEditState() {
    editingRequestId = null;
    editMeta = null;
    adjustments.clear();
  }

  function setDraft(id, field, value) {
    const key = String(id);
    const row = { ...draftFor(key) };
    if (field === 'qty') {
      const qty = Number(value);
      row.qty = Number.isSafeInteger(qty) && qty >= 0 ? qty : 0;
    } else if (field === 'direction' && (value === 'plus' || value === 'minus')) {
      row.direction = value;
    }
    adjustments.set(key, row);
    updateAdjustmentRow(key);
    updateAdjustmentSummary();
  }

  window.stockAdjustmentChange = function(id, field, value) {
    setDraft(id, field, value);
  };

  function directionButton(id, value, label, selected) {
    const selectedStyle = selected
      ? ' style="background:var(--primary);border-color:var(--primary);color:#fff;"'
      : '';
    return `<button type="button" class="smallbtn"${selectedStyle} onclick="stockAdjustmentChange('${esc(id)}','direction','${value}')">${label}</button>`;
  }

  function adjustmentCard(product) {
    const row = draftFor(product.id);
    const current = Number(stockData.currentStockMap[product.id] || 0);
    const projected = current + signed(row);
    return `<div class="stock-row" id="stock-adjustment-row-${esc(product.id)}">
      <div class="prod-info">
        <div class="prod-name flavor-badge">${esc(product.product_name)}</div>
        <div class="sub">${esc(product.spec)} ${esc(product.flavor || '')}</div>
        <div class="stock-qty">当前库存：<strong>${formatQtyToUnits(current, product.pcs_per_case, product.pcs_per_box, unitOf(product))}</strong> (${current}${esc(unitOf(product))})</div>
      </div>
      <div class="control-group">
        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">
          ${directionButton(product.id, 'plus', '增加', row.direction === 'plus')}
          ${directionButton(product.id, 'minus', '减少', row.direction === 'minus')}
        </div>
        <div class="sell-line">
          <span class="sell-tag" style="background:#756676;">散</span>
          <select class="ios-picker" onchange="stockAdjustmentChange('${esc(product.id)}','qty',this.value)">${makeQtyOptions(100,row.qty)}</select>
          <span class="sell-unit">${esc(unitOf(product))}</span>
        </div>
        <div class="sub">预计库存：<strong>${projected}${esc(unitOf(product))}</strong></div>
      </div>
    </div>`;
  }

  function selectedHtml() {
    const selected = products
      .map(product => ({ product, row: draftFor(product.id) }))
      .filter(entry => entry.row.qty > 0);
    if (!selected.length) {
      return '<div class="sub" style="margin:12px 0 76px;">选择非零散数后将自动加入申请。</div>';
    }
    return `<div class="sub" style="margin:12px 0 76px;">已选择商品：${selected.map(({ product, row }) => {
      const projected = Number(stockData.currentStockMap[product.id] || 0) + signed(row);
      return `${esc(product.product_name)} ${row.direction === 'minus' ? '减少' : '增加'} ${row.qty}${esc(unitOf(product))}，预计 ${projected}${esc(unitOf(product))}`;
    }).join('；')}</div>`;
  }

  function updateAdjustmentRow(id) {
    const product = products.find(item => String(item.id) === String(id));
    const node = $(`stock-adjustment-row-${id}`);
    if (product && node) node.outerHTML = adjustmentCard(product);
  }

  function updateAdjustmentSummary() {
    const node = $('stock-adjustment-summary');
    if (node) node.innerHTML = selectedHtml();
  }

  function renderAdjustmentProductArea() {
    const filters = $('stock-adjustment-filters');
    const list = $('stock-adjustment-products');
    if (filters) filters.innerHTML = generateFilterHeaderHtml();
    if (list) list.innerHTML = rows().map(adjustmentCard).join('');
  }

  function requestPanels(data) {
    const entries = Array.isArray(data) ? data : [];
    const active = entries.filter(entry => ['pending_review', 'rejected'].includes(entry.request.status));
    const history = entries.filter(entry => ['approved', 'withdrawn'].includes(entry.request.status));
    const block = (title, list, editable) => `<details>
      <summary style="font-weight:700;color:var(--primary);margin:10px 0;">${title}（${list.length}）</summary>
      ${list.map(entry => `<div class="item">
        <b>${esc(entry.request.request_no)} · ${esc(StockAdjustmentCore.statusLabel(entry.request.status))}</b>
        <div class="sub">${(entry.items || []).map(item => `${esc(item.product_name || item.product_barcode)} ${Number(item.adjustment_qty) > 0 ? '增加' : '减少'} ${Math.abs(Number(item.adjustment_qty))}`).join('；')}${entry.request.rejection_reason ? `；驳回：${esc(entry.request.rejection_reason)}` : ''}</div>
        ${editable ? `<button class="smallbtn" onclick="editStockAdjustmentRequest('${esc(entry.request.id)}')">${entry.request.status === 'pending_review' ? '撤回并修改' : '修改并重新提交'}</button>` : ''}
      </div>`).join('') || '<div class="sub">暂无记录</div>'}
    </details>`;
    return block('我的待审核和已驳回申请', active, true)
      + block('历史记录', history.filter(entry => entry.request.status === 'approved'), false)
      + block('已撤回申请', history.filter(entry => entry.request.status === 'withdrawn'), true);
  }

  async function loadPanels() {
    try {
      return requestPanels(await stockAdjustmentApi.mine(currentEmployee.code, true));
    } catch (error) {
      return `<div class="sub">${esc(error.message || '申请记录加载失败')}</div>`;
    }
  }

  function applyEditMeta() {
    if (!editMeta) return;
    const reason = $('adjustReason');
    const note = $('adjustReasonNote');
    const remark = $('adjustRemark');
    if (reason) reason.value = editMeta.reason_code || 'inventory_count';
    if (note) note.value = editMeta.reason_note || '';
    if (remark) remark.value = editMeta.remark || '';
  }

  window.openStockAdjustmentMode = async function() {
    adjustmentMode = true;
    STATE = 'STOCK_ADJUST';
    clearEditState();
    requestPanelsHtml = await loadPanels();
    await window.renderStockAdjustmentMode();
  };

  window.closeStockAdjustmentMode = function() {
    adjustmentMode = false;
    clearEditState();
    STATE = 'STOCK';
    renderStockPage();
  };

  window.renderStockAdjustmentMode = async function() {
    if (!adjustmentMode) return;
    $('list').innerHTML = `<div class="top-action-bar"><div class="back-btn" onclick="closeStockAdjustmentMode()">返回库存查看</div></div>
      <div class="big-store-title">申请修改库存</div>
      <div class="sub">只调整散数；增加为正数、减少为负数，允许预计库存为负数。</div>
      <div id="stock-adjustment-filters"></div>
      <div id="stock-adjustment-products"></div>
      <div id="stock-adjustment-summary">${selectedHtml()}</div>
      <div class="card" style="margin:12px 0;padding:12px;">
        <select id="adjustReason" class="ios-picker">
          <option value="inventory_count">盘点差异</option>
          <option value="damage">破损报废</option>
          <option value="transfer">调货</option>
          <option value="missed_receipt">漏录入库</option>
          <option value="other">其他</option>
        </select>
        <input id="adjustReasonNote" class="ios-picker" placeholder="其他时填写说明">
        <input id="adjustRemark" class="ios-picker" placeholder="备注（可选）">
      </div>
      <div id="stock-adjustment-request-panels">${requestPanelsHtml}</div>
      <button id="stockAdjustmentSubmit" class="float-submit" onclick="submitStockAdjustmentRequest()">保存并提交审核</button>`;
    renderAdjustmentProductArea();
    applyEditMeta();
  };

  window.editStockAdjustmentRequest = async function(id) {
    try {
      const data = await stockAdjustmentApi.mine(currentEmployee.code, true);
      const entry = (Array.isArray(data) ? data : []).find(item => item.request.id === id);
      if (!entry) throw new Error('未找到库存调整申请');
      if (entry.request.status === 'pending_review') {
        await stockAdjustmentApi.withdraw(id, currentEmployee.code);
      }
      adjustmentMode = true;
      STATE = 'STOCK_ADJUST';
      editingRequestId = id;
      editMeta = entry.request;
      adjustments.clear();
      (entry.items || []).forEach(item => adjustments.set(String(item.product_barcode), {
        direction: Number(item.adjustment_qty) < 0 ? 'minus' : 'plus',
        qty: Math.abs(Number(item.adjustment_qty)),
      }));
      requestPanelsHtml = await loadPanels();
      await window.renderStockAdjustmentMode();
    } catch (error) {
      alert(error.message || '打开申请失败');
    }
  };

  window.submitStockAdjustmentRequest = async function() {
    const items = [...adjustments.entries()]
      .map(([product_barcode, row]) => ({ product_barcode, adjustment_qty: signed(row) }))
      .filter(item => item.adjustment_qty !== 0);
    if (items.some(item => !Number.isSafeInteger(item.adjustment_qty))) {
      alert('散数必须是非负整数');
      return;
    }
    const reason = $('adjustReason').value;
    const note = $('adjustReasonNote').value;
    const remark = $('adjustRemark').value;
    if (!items.length) {
      alert('请选择至少一个非零散数');
      return;
    }
    if (reason === 'other' && !note.trim()) {
      alert('选择其他时必须填写说明');
      return;
    }

    const button = $('stockAdjustmentSubmit');
    try {
      if (button) {
        button.disabled = true;
        button.textContent = '正在提交..';
      }
      const saved = await stockAdjustmentApi.save(
        editingRequestId,
        currentEmployee.code,
        reason,
        note,
        remark,
        items,
      );
      const requestId = saved?.request?.id || saved?.id;
      if (!requestId) throw new Error('保存申请后未返回申请编号');
      await stockAdjustmentApi.submit(requestId, currentEmployee.code);
      alert('申请已提交审核');
      window.closeStockAdjustmentMode();
    } catch (error) {
      alert(error.message || '提交失败');
      if (button) {
        button.disabled = false;
        button.textContent = '保存并提交审核';
      }
    }
  };

  const oldRenderStockPage = window.renderStockPage;
  window.renderStockPage = function() {
    oldRenderStockPage();
    if (!adjustmentMode) {
      const title = $('list').querySelector('.sub');
      if (title) {
        title.insertAdjacentHTML('afterend', '<button class="smallbtn" style="margin:8px 0;" onclick="openStockAdjustmentMode()">申请修改库存</button>');
      }
    }
  };
})();
