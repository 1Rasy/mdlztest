(function() {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
  const admin = sessionStorage.getItem('admin_employee_code') || 'ADMIN';
  const stockAdjustmentApi = StockAdjustmentApi.create(client);

  function buttonsDisabled(disabled) {
    document.querySelectorAll('#queue button').forEach(button => {
      button.disabled = disabled;
    });
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  }

  function quantityClass(value) {
    const amount = Number(value);
    if (amount > 0) return 'qty-positive';
    if (amount < 0) return 'qty-negative';
    return 'qty-zero';
  }

  function renderMetrics(rows) {
    const requests = Array.isArray(rows) ? rows : [];
    const itemCount = requests.reduce((sum, entry) => sum + (Array.isArray(entry.items) ? entry.items.length : 0), 0);
    $('reviewMetrics').innerHTML = `
      <div class="metric"><div class="metric-label">待审核申请</div><div class="metric-value">${requests.length}</div><div class="metric-hint">按提交时间从早到晚排列</div></div>
      <div class="metric"><div class="metric-label">待审核商品行</div><div class="metric-value">${itemCount}</div><div class="metric-hint">库存以审核当下实时数量为准</div></div>`;
    $('reviewStatus').textContent = `${requests.length} 个申请`;
  }

  function renderRequest(entry) {
    const request = entry.request;
    const stock = new Map((entry.stocks || []).map(item => [item.product_barcode, Number(item.qty)]));
    const reason = StockAdjustmentCore.reasonLabel(request.reason_code);
    const detailNote = [request.reason_note, request.remark ? `备注：${request.remark}` : ''].filter(Boolean).join('；');
    return `<article class="review-request-card">
      <div class="review-request-head">
        <div class="review-request-title">
          <span>${esc(request.request_no)}</span>
          <span class="employee-pill">${esc(request.employee_code)}</span>
        </div>
        <div class="review-request-time">提交于 ${esc(formatDate(request.submitted_at))}</div>
      </div>
      <div class="review-request-reason">
        <div><strong>调整原因：</strong>${esc(reason)}</div>
        <div class="review-request-note">${detailNote ? esc(detailNote) : '无补充说明'}</div>
      </div>
      <div class="review-request-table">
        <div class="table-wrap">
          <table class="review-table">
            <thead><tr><th>商品名称/规格口味</th><th>条码</th><th>当前库存</th><th>调整</th><th>审核后库存</th></tr></thead>
            <tbody>${(entry.items || []).map(item => {
              const before = stock.get(item.product_barcode) || 0;
              const delta = Number(item.adjustment_qty);
              const after = before + delta;
              return `<tr>
                <td>${esc([item.product_name, item.spec, item.flavor].filter(Boolean).join(' '))}</td>
                <td class="cell-nowrap">${esc(item.product_barcode)}</td>
                <td class="cell-number stock-number">${before}</td>
                <td class="cell-number ${quantityClass(delta)}">${delta > 0 ? '+' : ''}${delta}</td>
                <td class="cell-number ${after < 0 ? 'qty-negative' : 'stock-number'}">${after}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
      <div class="review-request-actions">
        <button class="danger-outline" onclick="window.rejectAdjustment('${esc(request.id)}')">驳回</button>
        <button class="primary" onclick="window.approveAdjustment('${esc(request.id)}')">同意</button>
      </div>
    </article>`;
  }

  async function load() {
    $('reviewStatus').textContent = '正在加载...';
    $('queue').innerHTML = '<div class="loading-state">正在加载待审核申请...</div>';
    try {
      const rows = await stockAdjustmentApi.pending();
      const requests = Array.isArray(rows) ? rows : [];
      renderMetrics(requests);
      $('queue').innerHTML = requests.map(renderRequest).join('') || '<div class="empty-state">暂无待审核申请。</div>';
    } catch (error) {
      console.error(error);
      $('reviewStatus').textContent = '加载失败';
      $('queue').innerHTML = `<div class="error-state">加载失败：${esc(error.message || '未知错误')}</div>`;
    }
  }

  window.approveAdjustment = async id => {
    buttonsDisabled(true);
    try {
      await stockAdjustmentApi.approve(id, admin);
      await load();
    } catch (error) {
      alert(error.message || '审核失败');
      buttonsDisabled(false);
    }
  };

  window.rejectAdjustment = async id => {
    const reason = prompt('驳回理由（必填）');
    if (!reason?.trim()) return;
    buttonsDisabled(true);
    try {
      await stockAdjustmentApi.reject(id, admin, reason.trim());
      await load();
    } catch (error) {
      alert(error.message || '审核失败');
      buttonsDisabled(false);
    }
  };

  $('refresh').onclick = load;
  load();
})();
