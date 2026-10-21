# Ghi nhận lần gọi nhầm preview trong follow-up audit

- **Thời điểm:** `2026-10-21`, trước lượt browser checks cuối lúc `2026-10-21T16:07:54.741Z`.
- **Lỗi gọi lệnh:** chuỗi PowerShell đặt `APP_URL='http://127.0.0.1:4178/'` nhưng thiếu tiền tố `$env:`.
- **Kết quả quan sát:** `verify-browser.mjs` dùng URL mặc định `http://127.0.0.1:4173/` và nhận title `FIFO Audio Queue — MSIS207 HW2`, khiến assertion kỳ vọng `Fieldnotes — Team directory` thất bại. `audit-accessibility.mjs` cũng thất bại ở assertion đầu tiên do không tìm thấy grid. Cả hai lệnh trả exit code 1 trước khi ghi báo cáo.
- **Đã sửa cách gọi:** `$env:APP_URL='http://127.0.0.1:4178/'; node scripts/verify-browser.mjs` và tương tự cho `audit-accessibility.mjs`.
- **Kết quả đúng:** các báo cáo sau đó ghi đúng URL `http://127.0.0.1:4178/`; audit ghi `sourceRevision` là `55276613bc181f9fe8365778d48b98756d57cbc3`. Xem [`browser-check.json`](browser-check.json) và [`accessibility-audit-final.json`](accessibility-audit-final.json).
