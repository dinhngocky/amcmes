# AMCVN PostgreSQL Backend V1 — giữ giao diện V20.24

Bản chuyển backend để chạy thử độc lập với Google Sheets/Apps Script. Nguồn nghiệp vụ và giao diện đang phát triển vẫn ở `apps-script/`; không thay bằng V8 hoặc phiên bản cũ.

## Chạy thử trên máy có Docker Desktop

Từ thư mục `postgres`:

```sh
cp .env.example .env
```

Điền ba giá trị trong `.env`: `DB_PASSWORD`, `ADMIN_PASSWORD`, `FILE_SIGNING_SECRET`. Dùng chuỗi hex ngẫu nhiên cho mật khẩu database và khóa ký ảnh để không cần escape URL. Mật khẩu admin tối thiểu 12 ký tự; khóa ký ảnh tối thiểu 32 ký tự. Có thể tạo từng chuỗi bằng `openssl rand -hex 32`. Không đưa `.env` vào Git.

```sh
docker compose up -d db
docker compose build api
docker compose run --rm api npm run db:init
docker compose up -d api
```

Mở **http://localhost:3000**, đăng nhập bằng ADMIN_USERNAME/ADMIN_PASSWORD đã đặt. Database mới không có sản phẩm, BOM hay chứng từ mẫu. Khởi tạo công ty/kho, danh mục, dự án/máy và nhập BOM như giao diện cũ. `/health` báo kết nối PostgreSQL.

Không chạy hàm khởi tạo Google Sheets cho bản này. Không cần deploy Apps Script. File Google Sheet và deployment cũ không bị thay đổi. Volume `pgdata` giữ dữ liệu khi khởi động lại container.

Chạy Node trực tiếp nếu đã có PostgreSQL:

```sh
npm ci
# Thiết lập DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, FILE_SIGNING_SECRET trong môi trường.
npm run db:init
npm start
```

Database user phải có quyền tạo schema/table/index khi chạy db:init. DATABASE_URL không được commit hoặc đưa vào frontend. Với database hosted yêu cầu TLS, dùng `DB_SSL=true`; certificate được kiểm tra.

## Cách chuyển giữ nghiệp vụ

- Giao diện, CSS, navigation, modal và năm module hiện tại được phục vụ nguyên bản. Server chỉ chèn `web-rpc.js` để thay `google.script.run` bằng HTTP cùng origin.
- `POST /api/rpc` giữ `apiCall(token, fn, args, userAgent)` và năm hàm auth trực tiếp. Không cho gọi tùy ý hàm nội bộ hoặc SQL.
- Logic cũ chạy trong worker với lớp dữ liệu SQL. Giữ whitelist, phân quyền/hành động, lọc giá vốn, audit, sinh mã, BOM delta và đối soát ECN. Lớp tương thích range chỉ phục vụ vài nghiệp vụ còn dùng thao tác kiểu Sheet như bộ đếm.
- 94 bảng nghiệp vụ và Counters dùng tên nội bộ độc lập; không dựa vào nhãn tiếng Việt của tab. Thêm các bảng properties/cache/files cho dịch vụ backend.
- **Bản chuyển tiếp dùng JSONB riêng trong từng bảng**, giữ nguyên tên trường nghiệp vụ. Đây chưa phải mô hình toàn bộ cột typed và khóa ngoại SQL. Unique index ID/username/SKU bảo vệ trùng dữ liệu; các ràng buộc liên kết tiếp tục do nghiệp vụ kiểm tra. Có thể chuyển từng bảng sang cột typed/foreign key sau khi nghiệm thu tương đương.
- Index expression cho MachineID/ProductID/BOMVersionID/ProjectID/ModuleID và các ID chứng từ; compound MachineID+ModuleID. SKU, Part No. và tên có index lower. Tìm chứa chuỗi và bỏ dấu vẫn dùng bộ lọc hiện có trong phạm vi dữ liệu máy; chưa bổ sung full-text/trigram SQL.
- BOM/CTB dùng truy vấn SQL theo ID có index; ProductID join khi đọc chỉ lấy master liên quan. Phân trang/lọc vẫn theo máy và 20 dòng; tính tổng/CTB cần đọc đủ dữ liệu máy. Chưa chuyển mọi aggregate sang SQL hoặc LIMIT tại database. Các màn danh mục/legacy còn đọc toàn bảng tương ứng.
- Một transaction PostgreSQL cho mỗi request, một client xuyên suốt, savepoint cho mutation. Lỗi rollback cả dữ liệu và audit/session/cache. Advisory lock hiện tuần tự hóa request để giữ hành vi sinh mã/tồn kho trong bước chuyển; chưa tối ưu concurrency ở mức từng máy/chứng từ.
- Ảnh sản phẩm/logo/BOM/chat/chứng từ được lưu trong PostgreSQL, truy cập bằng URL ký. Giữ FILE_SIGNING_SECRET để URL cũ tiếp tục mở được; đây là link có quyền truy cập cho người nắm link, tương tự cơ chế chia sẻ ảnh cũ. Chưa dùng object storage riêng cho quy mô lớn.

## Phạm vi đã kiểm tra và giới hạn

`npm test` chạy bằng PGlite (engine PostgreSQL nhúng), không phải mock SQL: schema/index, login/session, whitelist/phân quyền, module loader, dự án/máy, sản phẩm, BOM delta/phát hành/CTB/PR đích danh thiếu cụm, phân trang 20 dòng/tìm trang sau, query plan index, rollback và ảnh. Test HTTP xác nhận frontend nhận shim, origin gate và RPC.

Chưa chạy Docker/native PostgreSQL/server cloud hoặc nghiệm thu trực quan trong browser thật. Chưa đo tải nhiều người/dữ liệu sản xuất. Không coi đây là bản đã nghiệm thu go-live.

Các tính năng phụ thuộc Google chưa có dịch vụ thay thế đầy đủ: backup lên Drive, trigger/email nhắc tự động, Google-file export và external URL fetch. Những thao tác này trả lỗi cần tích hợp thay vì giả báo thành công. In/xuất Excel ở trình duyệt, QR, nghiệp vụ dữ liệu hiện tại vẫn dùng code hiện có; chưa kiểm tra toàn bộ từng màn/modal. POS và finance giữ flag tắt; nhân sự/nguồn lực giữ cấu hình hiện tại.

Bộ backend dùng nguồn Code.gs hiện hành để tránh mất chức năng qua các lần đổi version. Khi chỉnh nghiệp vụ, chạy cả tests cũ và SQL tests. Không tự chạy builder lịch sử ghi đè Code.gs.

## Đưa lên server sau nghiệm thu

Docker Compose mặc định chỉ mở cổng trên loopback. Đặt reverse proxy HTTPS ở phía trước để người trong nhà máy truy cập; không xuất cổng database ra Internet. Cấu hình firewall/domain/certificate theo hạ tầng thực tế. Health, lỗi incident và lịch sử audit hỗ trợ kiểm tra.

Backup định kỳ bằng công cụ PostgreSQL, ví dụ:

```sh
docker compose exec -T db pg_dump -U amcvn -d amcvn -Fc > amcvn-backup.dump
```

Backup bao gồm ảnh. Thử restore sang database thử nghiệm khác trước khi nghiệm thu. Không dùng `docker compose down -v` nếu cần giữ dữ liệu.

Nguồn kỹ thuật: https://node-postgres.com/features/transactions ; https://www.postgresql.org/docs/current/indexes-expressional.html .
