# Bản đồ module AMCVN V20.24

Nguồn chính: `apps-script/`. Build đang có: `v20.24-969a11832328`.

## Điểm vào và phạm vi sửa

| Nghiệp vụ | Giao diện cần đọc trước | Backend |
|---|---|---|
| Đăng nhập, router, dashboard, helper, các override | `apps-script/index.html` | `apiCall`, auth và whitelist trong `Code.gs` |
| BOM, ECN, nhu cầu, PR/RFQ/PO, NCC | `apps-script/module_supply.html` | `Code.gs`: BOM, Purchasing, Material Control |
| Sản phẩm, kho, receiving, IQC, vị trí, kit, tem | `apps-script/module_warehouse.html` | `Code.gs`: Products, Warehouse, Stock |
| Dự án, máy, assembly, tiến độ, nguồn lực | `apps-script/module_production.html` | `Code.gs`: Projects/Machines, Execution |
| Quality, FAT, punch list, delivery | `apps-script/module_quality.html` | `Code.gs`: Quality/FAT và các bản mở rộng |
| Chức năng phụ trợ/cũ và lời gọi dùng chung | `apps-script/module_extended.html` | Các phân hệ tương ứng trong `Code.gs` |
| Cache, số đo hiệu năng, bộ tải module | `index.html`, `Performance.gs` | `Performance.gs` và điểm tích hợp trong `Code.gs` |

Các nhóm giao diện là cách phân gói tải theo nhu cầu, chưa phải ranh giới nghiệp vụ độc lập hoàn toàn. Hàm cùng tên có thể được override nhiều lần. Phải kiểm tra mọi định nghĩa và wrapper cuối.

## Tìm hàm mà không đọc toàn bộ code

```sh
node tools/find-function.cjs getMachineBOM
node tools/find-function.cjs purchase
rg -n 'FN_MODULE_|FN_ACTION_|SHEET_MODULE_|FN_EXTRA_' apps-script/Code.gs
```

`docs/function-index.json` chứa tên, file, dòng bắt đầu/kết thúc và loại định nghĩa. Tạo lại bằng `npm run index` sau mỗi lần chỉnh code. Chỉ đọc các vùng phù hợp với lỗi/yêu cầu; không đưa toàn bộ chỉ mục vào ngữ cảnh Codex.

## Mốc backend để bắt đầu tìm

Các vị trí dưới đây thuộc bản chuẩn hóa hiện tại; có thể dịch sau khi sửa, vì vậy ưu tiên chỉ mục được tạo lại.

| Dòng Code.gs | Phần |
|---:|---|
| 2007 | PRODUCTS |
| 2868 | CUSTOMERS / SUPPLIERS |
| 3101 | PURCHASE |
| 3466 | SALES |
| 3909 | QUOTES |
| 4043 | STOCK |
| 4150 | INVENTORY CHECK |
| 4222 | DEBT / PAYMENT |
| 4546 | SẢN XUẤT — Định mức (BOM) + Lệnh sản xuất |
| 5347 | REPORTS |
| 5507 | SETTINGS |
| 6005 | SETUP — TẠO SHEET + FORMAT + DEMO DATA |
| 7081 | FINANCE BASIC MODULE - Thu/Chi, So quy, Ngan sach, Bao cao co ban |
| 8180 | GIÁ BÁN & GIÁ GỐC (PRICING & COSTING) |
| 9851 | AMC MODULE: ENGINE NHẬP EXCEL (đồng bộ 4 phiên bản) |
| 11327 | HẾT ENGINE NHẬP EXCEL |
| 11688 | AMCVN CORE V1: DỰ ÁN -> MÁY -> MODULE |
| 12042 | AMCVN SPRINT 2: MATERIAL CONTROL & CTB |
| 12481 | AMCVN SPRINT 3: WAREHOUSE RECEIVING, IQC, LOCATION & KITTING |
| 12849 | AMCVN SPRINT 6: MACHINE BOM, VERSION & ECN |
| 13239 | AMCVN SPRINT 4: ASSEMBLY EXECUTION |
| 13466 | AMCVN SPRINT 5: QUALITY & FAT |
| 13658 | HẾT AMCVN SPRINT 5 |
| 13660 | AMC MODULE: ĐĂNG NHẬP & PHÂN QUYỀN |
| 14758 | HẾT MODULE ĐĂNG NHẬP & PHÂN QUYỀN |
| 14760 | AMC MODULE: NHIỀU KHO HÀNG & ĐIỀU CHUYỂN NỘI BỘ |
| 15590 | HẾT MODULE NHIỀU KHO HÀNG |
| 22579 | AMCVN V20.1 - WAREHOUSE FLOW |
| 22639 | AMCVN V20.1 - MACHINE-CENTERED PRODUCTION |
| 22687 | AMCVN V20.2 - MATERIAL CLASS & RESERVATIONS |
| 22708 | AMCVN V20.3 - UNIFIED PRODUCTION PLAN & ASSEMBLY |
| 22738 | AMCVN V20.6 - BOM ASSIGNMENT & QUICK ENTRY |
| 22781 | AMCVN V20.7 - OPERATIONAL EXCELLENCE |
| 22835 | AMCVN V20.9 - DEPARTMENT WORKSPACES |
| 22905 | V20.9: tách quyền Kỹ thuật/BOM khỏi quyền vận hành Sản xuất. |
| 22924 | AMCVN V20.10 - FAST BOOT & ACTION DASHBOARD |
| 22955 | AMCVN V20.11: frontend i18n coverage and English layout update; server API unchanged. |
| 22957 | AMCVN V20.12: compact navigation labels and layout; server API unchanged. |
| 22959 | AMCVN V20.13: responsive filter/action toolbar; server API unchanged. |
| 22961 | AMCVN V20.14: filtered shortage selection and top PR action; server API unchanged. |
| 22964 | AMCVN V20.16 - BOM MODULE ALLOCATION GRID |
| 23065 | AMCVN V20.17: fix BOM allocation validation invocation. |
| 23068 | AMCVN V20.18 - RELEASED BOM / CTB RECONCILIATION |
| 23335 | AMCVN V20.19 - SIMPLE SUPPLIER QUOTATION IMPORT |
| 23375 | AMCVN V20.20 - PURCHASE PROPOSAL REVIEW DETAIL |
| 23431 | AMCVN V20.21 - PERMISSION-AWARE APPROVAL TODO |

## Nguồn hiện hành và tài liệu lịch sử

- `apps-script/`: tám file dùng cho cập nhật/deploy.
- `README.md`: quy trình làm việc hiện tại.
- `docs/V20.23_ORIGINAL_README.md`: tài liệu thử nghiệm do gói nguồn cung cấp.
- `build-report.json`: ID build, hashes bundle và mapping trích xuất từ V20.22. Trường `functions[].line` là vị trí ở nguồn trước tách, không phải dòng hiện hành; dùng `function-index.json` thay thế.
- `baseline-v20.22/`, `patches/`, `tools/build.cjs`: lịch sử tái tạo bản V20.23. Không dùng để ghi đè các sửa đổi mới.
- `tests/server.cjs`: kiểm tra cache, invalidation, module endpoint và log.
- `tests/browser.cjs`: kiểm tra giao diện với RPC giả lập. Không thay thế chạy thử trên Google.

## Phạm vi thường đi cùng nhau

- Thêm trường sản phẩm: schema/labels/validation/API trong backend; form, import, tìm kiếm, xuất trong warehouse và helper dùng chung.
- Thay đổi BOM: supply + các override trong index; backend BOM/version/ECN; kiểm tra Material Control và export/import.
- Thay đổi kho: warehouse + backend stock/receiving/IQC/kit, cache và mutation locks.
- Thêm API: whitelist, action và quyền bổ sung; không chỉ thêm function.

## V20.24: BOM và vật tư theo máy

- `resolveMachineBOMV224_`, `writeBOMChangesV224_`, `removeBOMLinesV224_`: kế thừa version và lưu thay đổi.
- `readScopedRowsV224_`, `getMachineMaterialsPageV224`, `pageRowsV224_`: đọc theo máy/version, lọc trước phân trang 20 dòng.
- `normalizeMaterialRefV224_`, `hydrateMaterialRowsV224_`: ProductID và dữ liệu master.
- `bomImportPlan_`, `dedicatedReq_`, `syncMaterialModuleRefsV224_`: cụm tùy chọn, vật tư cấp máy, gán cụm sau ECN.
- Override cuối `index.html` V20.24: phân trang, RPC theo máy, bỏ kết quả request cũ, export đầy đủ theo phạm vi.
- Test nghiệp vụ: `tests/data-model.cjs`; test phân trang/RPC với DOM giả lập: `tests/pages.cjs`.

## Khởi tạo sạch

`setup/00_Create_Clean_AMCVN.gs`: script chạy tay tạo file mới, không thuộc tám file deploy. Dùng SCHEMA runtime của V20.24; giữ tài khoản/cấu hình, không copy master/giao dịch. Hướng dẫn trong `setup/README.md`; test `node tests/clean-setup.cjs`.

## Backend PostgreSQL V1

`postgres/` chạy Node/HTTP thay Apps Script, dùng lại nguồn nghiệp vụ/giao diện V20.24.

| Phần | File |
|---|---|
| Catalog 95 bảng/schema/index | postgres/src/catalog.mjs, postgres/sql/schema.sql |
| Dữ liệu SQL được tham số hóa | postgres/src/store.mjs |
| Nghiệp vụ, quyền, transaction/savepoint | postgres/src/runtime.mjs |
| Dịch vụ tương thích/range/counter | postgres/src/services.mjs |
| Worker bridge và RPC HTTP | postgres/src/dispatch.mjs, worker.mjs, server.mjs |
| Giao diện gọi HTTP | postgres/web-rpc.js |
| Khởi tạo database/admin | postgres/src/init.mjs |
| Chạy thử và phạm vi/giới hạn | postgres/README.md |
| Kiểm tra tích hợp SQL/HTTP | postgres/test/integration.test.mjs |

Không thay source Apps Script bằng source backend khác. JSONB là lớp chuyển tiếp giữ nghiệp vụ; typed schema/FK và tối ưu SQL aggregates là bước sau nghiệm thu tương đương.
