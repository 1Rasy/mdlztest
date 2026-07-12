(function() {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
  const stockAdjustmentApi = StockAdjustmentApi.create(client);
  let data = [];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  $('start').value = today;
  $('end').value = today;

  function draw() {
    $('rows').innerHTML = data.map(row => `<tr>
      <td>${esc(row.employee_code)}</td>
      <td>${esc(row.product_barcode)}</td>
      <td>${esc(StockAdjustmentCore.formatSpecFlavor(row))}</td>
      <td>${esc(row.reason_display)}</td>
      <td>${Number(row.quantity_delta) > 0 ? '+' : ''}${Number(row.quantity_delta)}</td>
      <td>${esc(new Date(row.occurred_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))}</td>
      <td>${esc(InventoryMovementExport.TYPE_LABELS[row.movement_type] || row.movement_type)}</td>
      <td>${esc(row.source_no)}</td>
      <td>${Number(row.quantity_before)}</td>
      <td>${Number(row.quantity_after)}</td>
      <td>${esc(row.operator_code)}</td>
    </tr>`).join('');
    $('status').textContent = `共 ${data.length} 条`;
  }

  async function query() {
    try {
      data = await stockAdjustmentApi.movements(
        $('start').value,
        $('end').value,
        $('employee').value,
        $('type').value,
      );
      if (!Array.isArray(data)) data = [];
      draw();
    } catch (error) {
      console.error(error);
      $('status').textContent = `查询失败：${error.message || '未知错误'}`;
    }
  }

  async function init() {
    const { data: employees, error } = await client
      .from('employees')
      .select('employee_code,name')
      .eq('is_active', true)
      .order('employee_code');
    if (error) throw error;
    $('employee').innerHTML += (employees || []).map(employee => (
      `<option value="${esc(employee.employee_code)}">${esc(employee.employee_code)} ${esc(employee.name)}</option>`
    )).join('');
    $('query').onclick = query;
    $('export').onclick = () => {
      const book = InventoryMovementExport.createWorkbook(XLSX, data);
      XLSX.writeFile(book, InventoryMovementExport.inventoryExportFileName($('start').value, $('end').value));
    };
    await query();
  }

  init().catch(error => {
    $('status').textContent = `加载失败：${error.message || '未知错误'}`;
  });
})();
