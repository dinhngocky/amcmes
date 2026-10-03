# V20.23 module loader fix

The supplied five module HTML files contain plain JavaScript. The loader previously passed these through createHtmlOutputFromFile, which validates HTML, then reported every exception as a missing file. Use createTemplateFromFile(...).getRawContent() to return the unprocessed source without evaluating server template expressions. The client still installs that JavaScript with the existing loader.

Backend-only compatibility fix: retain build v20.23-e633a2241a54 and all five byte-identical bundles. Authorization, whitelist and build validation remain enforced. Local tests mock Google services; actual deployment still requires verification.

## Cập nhật Apps Script

1. Mở project Apps Script của bản Google Sheet TEST.
2. Thay toàn bộ nội dung performance.gs đang có bằng file Performance.gs trong gói này. Không tạo thêm file trùng hàm.
3. Lưu project. Giữ nguyên Code.gs, index.html và năm module HTML, giữ nguyên SPREADSHEET_ID của Sheet TEST.
4. Nếu dùng URL /dev: mở lại trang sau khi lưu. Nếu dùng /exec: Deploy > Manage deployments > Edit > Version: New version > Deploy, rồi mở lại URL.
5. Đăng nhập, lần lượt mở Dự án/Máy, Kho/IQC, BOM/Material Control, Quality và Cài đặt.
6. Nếu vẫn lỗi, kiểm tra URL thuộc đúng project TEST và deployment mới; gửi thông báo lỗi cùng mục Executions.

Không cần chạy setup hay reset dữ liệu.

Gói chứa Git bundle đầy đủ để khôi phục codebase và lịch sử:
`git clone -b main AMCVN-v20.23-module-fix.bundle AMCminiERP`
