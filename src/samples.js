(function () {
  const namespace = window.DPRS || {};

  namespace.samples = {
    currentRun: `payment_batch_id,payment_id,vendor_name,invoice_number,invoice_date,amount,currency,payment_status,memo
BATCH-2026-05-03,RUN-001,Acme Office Supplies,INV-8841,2026-04-24,1280.00,USD,scheduled,monthly supplies
BATCH-2026-05-03,RUN-002,Northstar Logistics,NS-2207,2026-04-18,2450.00,USD,scheduled,freight invoice
BATCH-2026-05-03,RUN-003,Lakeside Cleaning,LC-510,2026-04-20,875.00,USD,scheduled,cleaning service
BATCH-2026-05-03,RUN-004,BluePeak Software,BP-998,2026-04-16,399.00,USD,scheduled,monthly software renewal
BATCH-2026-05-03,RUN-005,BluePeak Software LLC,BP-998,2026-04-16,399.00,USD,scheduled,duplicate row from import
BATCH-2026-05-03,RUN-006,Prime Electrical Services,PE-7730,2026-04-25,5210.00,USD,scheduled,site repair
BATCH-2026-05-03,RUN-007,GreenField Packaging,GF-4210,2026-04-27,1600.00,USD,scheduled,packaging order
BATCH-2026-05-03,RUN-008,Harbor Telecom,HT-2026-04,2026-04-12,640.00,USD,scheduled,telecom service
BATCH-2026-05-03,RUN-009,ACME Office Supply Co.,INV8841,2026-04-24,1280.00,USD,scheduled,resubmitted invoice
BATCH-2026-05-03,RUN-010,Summit Office Chairs,SO-110,2026-04-28,3100.00,USD,scheduled,new chair order
BATCH-2026-05-03,RUN-011,Metro Catering,MC-778,2026-04-19,920.00,USD,scheduled,event catering
BATCH-2026-05-03,RUN-012,Metro Catering Services,MC778-R,2026-04-19,920.00,USD,scheduled,revised catering invoice`,

    history: `payment_reference,payee,invoice_no,paid_date,amount,payment_status
HIST-1001,Acme Office Supplies,INV-8841,2026-04-28,1280.00,paid
HIST-1002,Old Town Water,OTW-300,2026-04-10,214.50,paid
HIST-1003,Harbor Telecom,HT-2026-04,2026-04-15,640.00,posted
HIST-1004,Prime Electrical Services,PE-7700,2026-04-22,5210.00,cleared
HIST-1005,BluePeak Software,BP-990,2026-03-16,399.00,paid`,

    aliases: `alias,canonical_vendor
ACME Office Supply Co.,Acme Office Supplies
BluePeak Software LLC,BluePeak Software
Metro Catering Services,Metro Catering
Prime Electrical Services,Prime Electrical Services`,

    currentRunZh: `付款批次,付款编号,供应商名称,发票号,发票日期,付款金额,币种,付款状态,备注
批次-2026-05-03,付款-001,北京云智科技有限公司,YZ-2026-0418,2026年04月18日,12800.00,CNY,待付款,云服务月费
批次-2026-05-03,付款-002,上海北辰办公用品有限公司,BC-8841,2026年04月24日,3200.00,CNY,待付款,办公用品
批次-2026-05-03,付款-003,深圳蓝峰软件有限公司,LF-998,2026年04月16日,3990.00,CNY,待付款,软件续费
批次-2026-05-03,付款-004,深圳蓝峰软件有限责任公司,LF-998,2026年04月16日,3990.00,CNY,待付款,重复导入行
批次-2026-05-03,付款-005,杭州远航物流有限公司,YH-2207,2026年04月18日,24500.00,CNY,待付款,物流费用
批次-2026-05-03,付款-006,上海北辰办公用品公司,BC8841,2026年04月24日,3200.00,CNY,待付款,补提交发票
批次-2026-05-03,付款-007,广州绿田包装有限公司,LT-4210,2026年04月27日,16000.00,CNY,待付款,包装订单
批次-2026-05-03,付款-008,广州港湾通信有限公司,GW-2026-04,2026年04月12日,6400.00,CNY,待付款,通信服务
批次-2026-05-03,付款-009,北京云智科技,YZ20260418,2026年04月18日,12800.00,CNY,待付款,补提交云服务发票
批次-2026-05-03,付款-010,苏州办公家具有限公司,BG-110,2026年04月28日,31000.00,CNY,待付款,办公椅采购
批次-2026-05-03,付款-011,上海都会餐饮有限公司,SHDC-778,2026年04月19日,9200.00,CNY,待付款,活动餐饮
批次-2026-05-03,付款-012,上海都会餐饮服务有限公司,SHDC778-R,2026年04月19日,9200.00,CNY,待付款,餐饮修订发票`,

    historyZh: `付款参考号,收款方,发票号码,已付日期,金额,付款状态
历史-1001,上海北辰办公用品有限公司,BC-8841,2026年04月28日,3200.00,已付款
历史-1002,深圳蓝峰软件有限公司,LF-990,2026年03月16日,3990.00,已入账
历史-1003,北京云智科技有限公司,YZ-2026-0318,2026年03月20日,12800.00,已支付
历史-1004,杭州远航物流有限公司,YH-2180,2026年04月10日,23800.00,已结清
历史-1005,广州港湾通信有限公司,GW-2026-04,2026年04月15日,6400.00,已付款`,

    aliasesZh: `别名,标准供应商
深圳蓝峰软件有限责任公司,深圳蓝峰软件有限公司
上海北辰办公用品公司,上海北辰办公用品有限公司
北京云智科技,北京云智科技有限公司
上海都会餐饮服务有限公司,上海都会餐饮有限公司`,
  };

  window.DPRS = namespace;
})();
