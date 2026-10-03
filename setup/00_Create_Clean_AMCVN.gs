/** V20.24: chạy tay trong cùng Apps Script project. Không gọi qua web API.
 * Tạo file mới; không sửa/xóa dữ liệu nguồn, không đổi CONFIG tự động.
 */
function createAMCVNCleanSpreadsheet() {
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    var source=getSpreadsheet_(),stamp=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMdd-HHmmss');
    var users=cleanAMCVNReadSource_(source,'Users');
    var settings=cleanAMCVNReadSource_(source,'Settings');
    var result=cleanAMCVNBuild_(source,users,settings,stamp);
    console.log('File mới: '+result.url+'\nSPREADSHEET_ID: '+result.spreadsheetId);
    if(result.bootstrapPassword)console.log('Tài khoản mới: '+result.bootstrapUsername+'\nMật khẩu tạm: '+result.bootstrapPassword+'\nĐổi mật khẩu sau lần đăng nhập đầu.');
    return result;
  } finally {lock.releaseLock();}
}
function cleanAMCVNReadSource_(ss,name) {
  var sh=ss.getSheetByName(resolveSheetName_(name))||ss.getSheetByName(name);
  if(!sh||sh.getLastRow()<2)return [];
  var values=sh.getDataRange().getValues(),headers=values.shift(),keys=SCHEMA[name],vi=viHeaders_(name);
  var indexes=keys.map(function(k,i){var p=headers.indexOf(k);return p>=0?p:headers.indexOf(vi[i]);});
  return values.filter(function(r){return r.some(function(v){return v!==''&&v!==null;});}).map(function(r){var o={};keys.forEach(function(k,i){o[k]=indexes[i]<0?'':r[indexes[i]];});return o;});
}
function cleanAMCVNWriteRows_(sh,name,rows) {
  if(!rows.length)return;
  if(sh.getMaxRows()<rows.length+1)sh.insertRowsAfter(sh.getMaxRows(),rows.length+1-sh.getMaxRows());
  sh.getRange(2,1,rows.length,SCHEMA[name].length).setValues(rows.map(function(r){return SCHEMA[name].map(function(k){return r[k]===undefined||r[k]===null?'':r[k];});}));
}
function cleanAMCVNBuild_(source,users,settings,stamp) {
  // Dùng SCHEMA sau khi tất cả installer của Code.gs đã chạy, gồm các cột V20.24.
  // Preflight trước khi tạo file: hai bảng khác nhau không được dùng chung tab.
  var tabOwners=Object.create(null);tabOwners['hướng dẫn']='README';
  Object.keys(SCHEMA).forEach(function(name){var label=resolveSheetName_(name),key=label.toLowerCase();if(tabOwners[key])throw new Error('Trùng tên tab '+label+': '+tabOwners[key]+' và '+name+'. Hãy cập nhật Code.gs trước khi chạy lại.');if(!SCHEMA[name].length)throw new Error('Schema rỗng: '+name);tabOwners[key]=name;});
  var ss=SpreadsheetApp.create('AMCVN — dữ liệu sạch V20.24 — '+stamp),readme=ss.getSheets()[0];
  console.log('Đang khởi tạo file mới: '+ss.getUrl());readme.setName('HƯỚNG DẪN');
  var front=['Settings','Users','Projects','Machines','MachineModules','Products','Customers','Suppliers','Warehouses','MachineBOMVersions','MachineBOMLines','BOMECNLogs','MaterialRequirements','MaterialExceptions','PurchaseRequisitions','PurchaseRequisitionItems','PurchaseOrders','PurchaseItems','WarehouseReceipts','WarehouseReceiptItems','IQCInspections','MaterialLocations','MaterialReservations','MaterialKits','MaterialKitItems','StockMovements','ProductionOrders','ProductionMaterials','ProductionProgressLogs'];
  var names=front.filter(function(n){return SCHEMA[n];}).concat(Object.keys(SCHEMA).filter(function(n){return front.indexOf(n)<0;}));
  var tabs={},visible=0;
  names.forEach(function(name){
    var headers=viHeaders_(name),sh=ss.insertSheet(resolveSheetName_(name));tabs[name]=sh;
    if(sh.getMaxRows()>25)sh.deleteRows(26,sh.getMaxRows()-25);
    if(sh.getMaxColumns()<headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),headers.length-sh.getMaxColumns());
    if(sh.getMaxColumns()>headers.length)sh.deleteColumns(headers.length+1,sh.getMaxColumns()-headers.length);
    sh.getRange(1,1,1,headers.length).setValues([headers]).setBackground('#630ed4').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
    sh.setFrozenRows(1);sh.setColumnWidths(1,headers.length,140);
    // Tránh mất số 0 đầu mã hàng/SKU khi nhập trực tiếp vào Sheet.
    SCHEMA[name].forEach(function(k,i){if(/ID$|SKU|PartNumber|DrawingNo|Code$|Password|Username/.test(k))sh.getRange(2,i+1,24,1).setNumberFormat('@');});
    if(front.indexOf(name)<0)sh.hideSheet();else visible++;
  });
  var defaults={BusinessName:'AMCVN',Currency:'VND',DefaultVAT:'10',LowStockDefault:'10',MaxStockDefault:'500',ProductUnits:'PCS, SET, cái, bộ, kg, m',ProductCategories:'Thành phẩm, Module, Vật tư gia công CNC, Vật tư Kim loại tấm, Vật tư tiêu chuẩn, Vật tư phụ trợ, CCDC, Khác',ReminderEnabled:'false',RemindCustomers:'false',LogoUrl:'',TaxCode:'',Phone:'',CompanyAddress:'',BankInfo:'',BankCode:'',BankAccount:'',BankAccountName:''};
  settings.forEach(function(r){if(Object.prototype.hasOwnProperty.call(defaults,r.Key)&&['ReminderEnabled','RemindCustomers'].indexOf(r.Key)<0)defaults[r.Key]=r.Value;});
  cleanAMCVNWriteRows_(tabs.Settings,'Settings',Object.keys(defaults).map(function(k){return {Key:k,Value:defaults[k],Description:'Cấu hình khởi tạo sạch V20.24'};}));
  var copied=users.filter(function(u){return !!u.Username&&!!u.PasswordHash&&!!u.PasswordSalt;}),password='',username='';
  if(!copied.some(function(u){return String(u.Role||'').trim()==='Quản trị'&&String(u.Status||'')==='Đang hoạt động';})){
    password=Utilities.getUuid()+Utilities.getUuid().slice(0,8);username='admin';while(copied.some(function(u){return String(u.Username).toLowerCase()===username;}))username+='new';
    var salt=authNewSalt_();copied.push({UserID:'U-'+Utilities.getUuid(),FullName:'Quản trị viên',Username:username,Role:'Quản trị',Status:'Đang hoạt động',PasswordSalt:salt,PasswordHash:authHash_(password,salt),Permissions:authFormatPerms_(authRolePerms_('Quản trị')),CreatedAt:new Date(),LastLoginAt:''});
  }
  copied=copied.map(function(u){var row=Object.assign({},u);row.LastLoginAt='';return row;});
  cleanAMCVNWriteRows_(tabs.Users,'Users',copied);
  var info=[['AMCVN V20.24','File mới: không có dữ liệu giao dịch/demo'],['Nguồn giữ nguyên',source.getUrl()],['ID file mới',ss.getId()],['Tài khoản',copied.length+' tài khoản; mật khẩu tài khoản cũ giữ nguyên'],['Chuyển ứng dụng','Dán ID file mới vào CONFIG.SPREADSHEET_ID của Code.gs, lưu và deploy version mới'],['Schema','Đủ bảng tương thích; bảng kỹ thuật được ẩn, mở qua View → Hidden sheets'],['Không chạy','Không chạy setup/reset demo; không tạo lại ứng dụng từ code cũ'],['Bắt đầu','Cấu hình công ty/kho → sản phẩm → dự án/máy → nhập BOM → phát hành → CTB'],['Cụm tùy chọn','Excel thiếu cụm: cấp Toàn máy; gán cụm sau bằng BOM/ECN']];
  readme.getRange(1,1,info.length,2).setValues(info);readme.setColumnWidth(1,180);readme.setColumnWidth(2,650);readme.getRange(1,1,info.length,2).setWrap(true);readme.setFrozenRows(1);
  SpreadsheetApp.flush();
  return {spreadsheetId:ss.getId(),url:ss.getUrl(),tables:names.length,visibleTables:visible,copiedUsers:copied.length,bootstrapUsername:username,bootstrapPassword:password};
}
