# Validation — AMCVN PostgreSQL V1

Nguồn nghiệp vụ/giao diện: V20.24, build v20.24-969a11832328; có sửa nhãn bảng phiếu mua chờ duyệt và bộ khởi tạo sạch từ commit b247e9b.

18 integration tests pass against embedded PostgreSQL (PGlite), including HTTP requests through the real Node server and worker bridge:

- 95 domain tables and ID/scope/search indexes.
- Unauthenticated/internal RPC rejection; login/session; whitelist prototype-name rejection.
- Exact authenticated module loading; unchanged UI with HTTP shim.
- Project/machine/product creation; duplicate prevention.
- Whole-machine BOM, delta revision, inherited edit, parent immutability.
- CTB/Material Control and dedicated PR without module.
- SQL savepoint rollback.
- Initial/boot payloads present, not silently null.
- Limited role denied project creation.
- 20 rows/page; late result across full machine scope; indexed query plan.
- Image storage/export and invalid MIME rejection.
- HTTP origin gate and Vietnamese payload round-trip.
- Opening stock ledger and stock guards.
- Excel BOM preview/import without module.
- ECN V2 release obsoletes the previous BOM, updates the existing CTB requirement in place and does not duplicate material demand.
- Audit events may share the same timestamp; `AuditLog.Time` is indexed for lookup but is not a unique identifier.

Docker Desktop validation on Apple Silicon also passed with PostgreSQL 17.11 and Node 22: schema ensure migrated the legacy AuditLog unique index without deleting data, `/health` returned `ok`, login/bootstrap succeeded, and the live V1→V2 ECN flow reconciled CTB from quantity 3 to 5 with one active requirement.

Apps Script syntax/build/hash checks and clean-setup tests also pass. `npm audit --omit=dev` reported zero production dependency vulnerabilities at this check.

Not executed: hosted PostgreSQL/TLS; multiple live connections/workers/instances under load; full browser visual regression; the entire RFQ→PO→receiving→IQC→kit→production/FAT workflow end-to-end. Google backup/email/triggers are not ported. Tests do not establish full production readiness or a speed multiplier.
