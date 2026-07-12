(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.StockAdjustmentApi=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const migrationMessage='搴撳瓨璋冩暣鍔熻兘灏氭湭瀹屾垚鏁版嵁搴撻儴缃诧紝璇疯仈绯荤鐞嗗憳銆?;
  function toError(error){
    const message=String(error?.message||'');
    if(error?.code==='PGRST202'||/could not find (the )?function|function .* does not exist|schema cache/i.test(message))return new Error(migrationMessage);
    return error instanceof Error?error:new Error(message||'搴撳瓨璋冩暣鎿嶄綔澶辫触');
  }
  function create(client){
    if(!client||typeof client.rpc!=='function')throw new Error('Supabase client 鏈垵濮嬪寲');
    const rpc=(name,args)=>Promise.resolve(client.rpc(name,args)).then(({data,error}={})=>{if(error)throw toError(error);return data;});
    return {
      save:(id,employee,reason,note,remark,items)=>rpc('save_stock_adjustment_request',{p_request_id:id||null,p_employee_code:employee,p_reason_code:reason,p_reason_note:note||null,p_remark:remark||null,p_items:items}),
      submit:(id,employee)=>rpc('submit_stock_adjustment_request',{p_request_id:id,p_employee_code:employee}),
      withdraw:(id,employee)=>rpc('withdraw_stock_adjustment_request',{p_request_id:id,p_employee_code:employee}),
      mine:(employee,history)=>rpc('get_my_stock_adjustment_requests',{p_employee_code:employee,p_include_history:!!history}),
      pending:()=>rpc('get_pending_stock_adjustment_requests',{}),
      approve:(id,admin)=>rpc('approve_stock_adjustment_request',{p_request_id:id,p_admin_code:admin}),
      reject:(id,admin,reason)=>rpc('reject_stock_adjustment_request',{p_request_id:id,p_admin_code:admin,p_rejection_reason:reason}),
      movements:(start,end,employee,type)=>rpc('get_inventory_movement_details',{p_start_date:start,p_end_date:end,p_employee_code:employee||null,p_movement_type:type||null})
    };
  }
  return {create};
});

