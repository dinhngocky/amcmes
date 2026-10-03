# Triển khai bản kiểm tra tốc độ trên Render Free

## Mục tiêu và giới hạn phép đo

Cấu hình `render.yaml` tạo một web service Docker và một PostgreSQL 17 tại Singapore. Phương án này phù hợp để kiểm tra giao diện, dữ liệu thật ở mức thử nghiệm và so sánh thời gian phản hồi khi ứng dụng đã khởi động.

Free web service sẽ ngủ sau thời gian không có truy cập, nên lần mở đầu tiên không đại diện cho tốc độ sử dụng bình thường. Gói miễn phí cũng không dùng để kết luận khả năng phục vụ 50 người đồng thời. Hãy tách kết quả thành hai nhóm:

- **Cold start:** lần mở đầu tiên sau ít nhất 20 phút không truy cập.
- **Warm response:** đo sau khi `/health` đã trả về `status: ok` và thực hiện cùng thao tác 5 lần.

## 1. Đưa source lên Git riêng tư

Tạo một repository GitHub/GitLab riêng tư và đẩy toàn bộ thư mục gốc của workspace này lên repository. File `render.yaml` phải nằm ở thư mục gốc, cùng cấp với `postgres` và `apps-script`.

Không commit `.env`, mật khẩu, URL database hoặc dữ liệu sản xuất. `.gitignore` hiện đã loại `.env` và `postgres/.env`.

Ví dụ khi repository chưa được khởi tạo:

```bash
git init
git add .
git commit -m "Prepare AMCVN online speed test"
git branch -M main
git remote add origin <URL_REPOSITORY_RIENG_TU>
git push -u origin main
```

## 2. Tạo dịch vụ bằng Render Blueprint

1. Đăng nhập Render và chọn **New > Blueprint**.
2. Kết nối repository riêng tư vừa tạo.
3. Chọn file Blueprint `render.yaml`.
4. Giữ hai tài nguyên ở region **Singapore** và plan **Free**.
5. Khi Render hỏi `ADMIN_PASSWORD`, nhập mật khẩu thử nghiệm dài ít nhất 12 ký tự. Không dùng mật khẩu đang dùng trong hệ thống thật.
6. Chọn **Apply/Deploy Blueprint** và theo dõi log build.

Blueprint tự thực hiện các việc sau:

- Build image bằng `postgres/Dockerfile`.
- Gắn `DATABASE_URL` nội bộ của PostgreSQL vào ứng dụng.
- Chạy `npm run db:init` trước khi mở server; thao tác này tạo/cập nhật schema và tài khoản quản trị khi database còn trống.
- Chạy ứng dụng bằng `npm start`, bind `0.0.0.0` và cổng do Render cấp.
- Dùng `/health` làm health check.

Khi deploy xong, mở URL dạng `https://amcvn-erp-test.onrender.com/health`. Kết quả đúng có dạng:

```json
{"status":"ok","backend":"postgresql"}
```

Sau đó mở URL gốc và đăng nhập bằng `admin` cùng mật khẩu đã nhập.

## 3. Chuẩn bị dữ liệu kiểm tra

Không dùng database sản xuất cho phép thử đầu tiên. Tạo/import bộ dữ liệu đại diện:

- Ít nhất 5 dự án, 20–30 máy và một BOM lớn 200–500 dòng.
- Có hai phiên bản BOM để kiểm tra release ECN và đồng bộ CTB.
- Có dữ liệu thiếu vật tư, PR/RFQ/PO, nhập kho, kit, kế hoạch sản xuất và quality issue.
- Nếu cần đánh giá gần quy mô mục tiêu, tăng dần tới 100 máy nhưng chỉ dùng dữ liệu đã ẩn thông tin nhạy cảm.

## 4. Đo tốc độ đúng cách

### Đo đường truyền và phản hồi server

Thay URL dưới đây bằng URL Render thực tế:

```bash
curl -s -o /dev/null \
  -w 'DNS=%{time_namelookup}s Connect=%{time_connect}s TLS=%{time_appconnect}s TTFB=%{time_starttransfer}s Total=%{time_total}s\n' \
  https://amcvn-erp-test.onrender.com/health
```

Ghi riêng lần cold start. Sau khi health trả về thành công, chạy lại 5 lần và lấy trung vị của `TTFB` và `Total`.

### Đo trong giao diện

Mở Chrome DevTools > **Network**, bật **Preserve log**, tắt cache chỉ khi muốn đo tải tài nguyên lần đầu. Đo các luồng sau:

1. Đăng nhập và mở Dashboard.
2. Mở danh sách máy, sau đó mở chi tiết một máy.
3. Mở BOM 200–500 dòng, tìm kiếm và lọc.
4. Release BOM V2/ECN rồi kiểm tra CTB chỉ lấy BOM đang release.
5. Mở CTB, Shortage, PR chờ duyệt và danh sách kho.

Với mỗi thao tác, ghi:

- Thời gian request API chính.
- TTFB và kích thước response.
- Thời gian từ lúc bấm đến khi bảng hiển thị ổn định.
- Số request bị gọi lặp hoặc bị hủy.
- Trạng thái cold/warm và số dòng dữ liệu.

Mẫu ghi kết quả:

| Luồng | Dữ liệu | Cold/Warm | API | UI hoàn tất | Response size | Ghi chú |
|---|---:|---|---:|---:|---:|---|
| Dashboard | 30 máy | Warm |  |  |  |  |
| BOM detail | 500 dòng | Warm |  |  |  |  |
| CTB filter | 500 dòng | Warm |  |  |  |  |
| Release V2 | 1 ECN | Warm |  |  |  |  |

## 5. Cách đọc kết quả

- Cold start khoảng hàng chục giây đến khoảng một phút là đặc tính của free service, không phải riêng lỗi ứng dụng.
- Nếu `/health` warm nhanh nhưng màn hình chậm, kiểm tra kích thước payload, số lần gọi API và thời gian render bảng.
- Nếu cả `/health` và API warm đều chậm, kiểm tra log Render, truy vấn PostgreSQL và mức sử dụng RAM/CPU.
- Nếu chỉ các bảng lớn chậm, ưu tiên phân trang phía server, index theo điều kiện lọc và không tải trước dữ liệu chi tiết chưa mở.

## 6. Bảo vệ dữ liệu và kết thúc thử nghiệm

- Free PostgreSQL không có backup tự động. Chỉ dùng dữ liệu thử nghiệm hoặc tự xuất backup trước khi cần giữ lại.
- Không lưu bí mật vào source; đổi `ADMIN_PASSWORD` ngay nếu đã chia sẻ cho người khác.
- Xóa Blueprint/database khi kết thúc thử nghiệm để tránh để URL thử nghiệm công khai.
- Render Free PostgreSQL hết hạn sau 30 ngày, nên hoàn tất đo và xuất dữ liệu trước thời hạn này.

## Khi cần thử 50 người đồng thời

Free tier chỉ phù hợp tạo baseline. Để thử tải 50 người, dùng một môi trường ngắn hạn có ít nhất 1–2 GB RAM, database không ngủ và cùng region Singapore. Chạy các kịch bản tăng dần 1, 5, 10, 25 rồi 50 virtual users; theo dõi p50, p95, error rate, CPU, RAM và số connection database. Không chạy bài tải này trên gói Free vì kết quả chủ yếu phản ánh giới hạn 0.1 CPU/512 MB của nền tảng.
