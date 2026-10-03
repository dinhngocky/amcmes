# Tạo Google Sheet sạch — AMCVN V20.24

Dùng trong project Apps Script V20.24 đang chạy, không cần thay tám file ứng dụng vừa cập nhật.

1. Tạo file script mới tên `00_Create_Clean_AMCVN`; dán nội dung `00_Create_Clean_AMCVN.gs`.
2. Trên thanh chọn hàm, chọn **createAMCVNCleanSpreadsheet**, bấm Run. Google có thể yêu cầu cấp quyền tạo spreadsheet.
3. Trong Execution log, mở liên kết **File mới**, sao chép **SPREADSHEET_ID**.
4. Trong Code.gs đổi `CONFIG.SPREADSHEET_ID` sang ID vừa tạo, lưu. Tạo deployment version mới cho ứng dụng thử nghiệm.
5. Đăng nhập bằng tài khoản/mật khẩu cũ. Nếu nguồn không có admin hoạt động, log trả tài khoản và mật khẩu tạm mới; đổi mật khẩu sau đăng nhập.

File mới không chứa sản phẩm, dự án, BOM, tồn kho hay chứng từ cũ. Chỉ giữ các tài khoản có thông tin đăng nhập và một số cài đặt công ty/danh mục. Không dùng dữ liệu công ty giả. Nhắc nợ tự động mặc định tắt. Các trigger đã có trong Apps Script project không được chuyển hoặc sửa; kiểm tra lại đích file nếu dùng trigger riêng.

Bảng dữ liệu khởi tạo với 25 dòng và đúng số cột cần dùng. Sheets tự tăng dòng khi ứng dụng ghi thêm. Bảng kỹ thuật/phụ trợ vẫn có header để tương thích code, nhưng ẩn khỏi dãy tab. Có thể mở lại bằng View → Hidden sheets.

Bản gốc không bị sửa/xóa. Hàm không tự chuyển ứng dụng sang file mới; bước 4 là thao tác chuyển. Mỗi lần chạy tạo một file mới, chỉ cần chạy một lần. Không chạy setup demo/reset dữ liệu.

Thứ tự nhập mới: cấu hình doanh nghiệp và kho → sản phẩm/NCC/khách hàng → dự án/máy → BOM → phát hành BOM → Material Control → mua/nhận/IQC/kho.

Đã kiểm tra bằng mô phỏng SpreadsheetApp; chưa chạy trực tiếp trong Google Apps Script.

## Sửa lỗi trùng tab “Chi tiết phiếu mua”

Thay nội dung file khởi tạo đã thêm bằng bản sửa này, không thêm file thứ hai chứa cùng tên hàm.

Trong `Code.gs`, ở bảng labels của procurement, đổi:

```javascript
PurchaseProposalItems:'Chi tiết phiếu mua'
```

thành:

```javascript
PurchaseProposalItems:'Chi tiết phiếu mua chờ duyệt'
```

Gói sửa kèm Code.gs đã đổi đúng một nhãn này so với V20.24. Nếu thay cả file, giữ CONFIG.SPREADSHEET_ID của project hiện tại. Không cần thay Performance.gs, index.html hoặc các module.

Lưu và chạy lại createAMCVNCleanSpreadsheet. File khởi tạo dở của lần lỗi không được sử dụng; chạy lại tạo file mới hoàn chỉnh. Chưa đổi CONFIG sang file mới cho đến khi hàm chạy thành công.

Kiểm tra bổ sung dùng đầy đủ 94 schema và các mapping tên tab thật của Code.gs: không còn trùng tên; mapping trùng bị chặn trước khi tạo file.
