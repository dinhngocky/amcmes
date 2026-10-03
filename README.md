# AMCVN miniERP — codebase V20.24

Bản chuẩn hóa từ ZIP người dùng cung cấp ngày 03/10/2026. Nguồn ứng dụng hiện hành là `apps-script/`, không phải các ZIP cũ hoặc baseline V20.22.

## Làm việc với Codex

1. Mở thư mục repository này trong Codex.
2. Nêu nghiệp vụ, lỗi/thay đổi mong muốn và ví dụ kết quả.
3. Codex đọc `AGENTS.md`, `MODULE_MAP.md`, tìm hàm rồi chỉ sửa vùng liên quan.
4. Kiểm tra diff, chạy kiểm tra liên quan, commit và đóng gói.

Mẫu yêu cầu: “Sửa module Mua hàng: tìm sản phẩm theo SKU, tên và Part No. Giữ quyền và luồng lưu hiện tại. Kiểm tra phần liên quan, commit thay đổi và đóng gói deploy.”

## Kiểm tra và đóng gói

Yêu cầu Node.js 22+; các lệnh kiểm tra cơ bản không cần npm install. Công cụ parser dùng Acorn đi kèm nội bộ Node như bộ nguồn cung cấp; môi trường Node không có thành phần này cần thay bằng parser được quản lý trước khi dùng.

```sh
npm run check
npm test
npm run index
npm run package
```

`dist/AMCVN-v20.24-deploy.zip` chỉ chứa tám file Apps Script. `check` kiểm tra cú pháp, ID build và hashes các bundle. Khi sửa bundle, phải quản lý một build mới nhất quán và cập nhật hash sau khi review. Không bỏ kiểm tra hash để chạy lẫn phiên bản.

Browser test cần Playwright và Chromium. Chỉ định `PLAYWRIGHT_MODULE` và `CHROME_PATH` theo môi trường. RPC trong test là giả lập; vẫn cần kiểm tra dữ liệu/quyền thật trên môi trường Google thử nghiệm.

## Git

- `v20.23-import`: bộ nguồn nguyên trạng khi nhận ZIP.
- `v20.23`: bản chuẩn hóa, tên file Apps Script đúng và tài liệu/chỉ mục/công cụ kiểm tra.
- Mỗi chức năng tiếp theo nên có một commit riêng. Dùng `git diff` để review và `git log --oneline` để xem lịch sử.
- Gói giao hàng có `AMCVN-PostgreSQL-history.bundle`. Khôi phục repository kèm lịch sử bằng `git clone -b main AMCVN-PostgreSQL-history.bundle ../AMCminiERP-git` khi đang ở thư mục giải nén. Các tag được giữ trong bundle.
- Repository đã tạo ở local; chưa gắn GitHub/remote. Khi có repository đích, thêm remote và push main/tags. Không đưa token vào file hay URL remote.

## Apps Script

Cập nhật `Code.gs`, `Performance.gs`, `index.html` và năm `module_*.html` từ cùng gói deploy. Module HTML chứa JavaScript thuần, không thêm thẻ script hoặc mẫu HTML. Không tự đoán manifest hoặc thay quyền/trigger của dự án Google.

Các file `.txt` giao diện được đổi thành `.html` theo đúng tên bộ tải; nội dung ứng dụng giữ nguyên byte. Không chạy `tools/build.cjs` cho sửa chức năng thường ngày: builder lịch sử có thể ghi đè nguồn mới.

Tài liệu thử nghiệm đầy đủ: [V20.23 original README](docs/V20.23_ORIGINAL_README.md). Bản đồ module: [MODULE_MAP.md](MODULE_MAP.md).

Bản V20.24: [Thay đổi và cách kiểm tra](docs/V20.24_RELEASE.md). Dùng `node tools/stamp.cjs v20.24` để ghi build/hashes sau khi sửa nguồn; công cụ này không tạo lại module từ baseline.

## Chạy với PostgreSQL

Backend Node/PostgreSQL và Docker Compose nằm trong `postgres/`. Đọc [hướng dẫn chạy thử và phạm vi](postgres/README.md). Bản này giữ giao diện V20.24 bằng RPC shim và chưa thay deployment Google hiện tại. Kiểm tra SQL: `npm ci --prefix postgres`, `npm test --prefix postgres`.
