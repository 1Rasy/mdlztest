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

  async function load() {
    try {
      const rows = await stockAdjustmentApi.pending();
      $('queue').innerHTML = (Array.isArray(rows) ? rows : []).map(entry => {
        const request = entry.request;
        const stock = new Map((entry.stocks || []).map(item => [item.product_barcode, Number(item.qty)]));
        return `<article class="item">
          <b>${esc(request.request_no)} · ${esc(request.employee_code)}</b>
          <div class="muted">${esc(StockAdjustmentCore.reasonLabel(request.reason_code))}${request.reason_note ? `：${esc(request.reason_note)}` : ''}${request.remark ? `；备注：${esc(request.remark)}` : ''}；提交于 ${esc(request.submitted_at || '')}</div>
          <table>
            <tr><th>商品名称/规格口味</th><th>条码</th><th>当前库存</th><th>调整</th><th>审核后</th></tr>
            ${(entry.items || []).map(item => {
              const before = stock.get(item.product_barcode) || 0;
              return `<tr>
                <td>${esc([item.product_name, item.spec, item.flavor].filter(Boolean).join(' '))}</td>
                <td>${esc(item.product_barcode)}</td>
                <td>${before}</td>
                <td>${Number(item.adjustment_qty) > 0 ? '+' : ''}${Number(item.adjustment_qty)}</td>
                <td>${before + Number(item.adjustment_qty)}</td>
              </tr>`;
            }).join('')}
          </table>
          <div class="row">
            <button onclick="window.approveAdjustment('${esc(request.id)}')">同意</button>
            <button class="secondary" onclick="window.rejectAdjustment('${esc(request.id)}')">驳回</button>
          </div>
        </article>`;
      }).join('') || '<p class="muted">暂无待审核申请。</p>';
    } catch (error) {
      console.error(error);
      $('queue').textContent = `加载失败：${error.message || '未知错误'}`;
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

  load();
})();
