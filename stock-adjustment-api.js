(function(root){
  const rpc=(name,args)=>root.client.rpc(name,args).then(({data,error})=>{if(error)throw error;return data;});
  root.StockAdjustmentApi={
    save:(id,employee,reason,note,remark,items)=>rpc('save_stock_adjustment_request',{p_request_id:id||null,p_employee_code:employee,p_reason_code:reason,p_reason_note:note||null,p_remark:remark||null,p_items:items}),
    submit:(id,employee)=>rpc('submit_stock_adjustment_request',{p_request_id:id,p_employee_code:employee}),
    withdraw:(id,employee)=>rpc('withdraw_stock_adjustment_request',{p_request_id:id,p_employee_code:employee}),
    mine:(employee,history)=>rpc('get_my_stock_adjustment_requests',{p_employee_code:employee,p_include_history:!!history}),
    pending:()=>rpc('get_pending_stock_adjustment_requests',{}),
    approve:(id,admin)=>rpc('approve_stock_adjustment_request',{p_request_id:id,p_admin_code:admin}),
    reject:(id,admin,reason)=>rpc('reject_stock_adjustment_request',{p_request_id:id,p_admin_code:admin,p_rejection_reason:reason}),
    movements:(start,end,employee,type)=>rpc('get_inventory_movement_details',{p_start_date:start,p_end_date:end,p_employee_code:employee||null,p_movement_type:type||null})
  };
})(window);

