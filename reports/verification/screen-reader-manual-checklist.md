# Kịch bản kiểm tra screen reader thủ công

**Trạng thái:** CHƯA XÁC MINH. Máy hiện không có NVDA; theo yêu cầu người dùng, Narrator không được dùng cho lượt kiểm tra này. Không có lời đọc nào được mô phỏng hoặc ghi nhận như kết quả thực tế.

**Bằng chứng máy hiện có:** Chrome 155 Accessibility Tree trong [`accessibility-audit-final.json`](accessibility-audit-final.json). Đây chỉ là bằng chứng DOM/AX, không phải lời đọc screen reader.

## Chuẩn bị

1. Dùng NVDA hoặc một screen reader khác mà người kiểm tra đã cài và có thể vận hành. NVDA tải từ [trang chính thức của NV Access](https://www.nvaccess.org/download/); ghi lại phiên bản screen reader, browser, OS và thời điểm.
2. Trong NVDA, bật **Speech Viewer** từ menu NVDA → Tools → Speech Viewer để lưu đúng nội dung synthesizer đọc. Xem [hướng dẫn Speech Viewer chính thức](https://download.nvaccess.org/releases/2026.2/documentation/userGuide.html#SpeechViewer).
3. Mở production preview `http://127.0.0.1:4178/`. Nếu thao tác mũi tên bị browser browse mode giữ lại, chuyển sang chế độ tương tác/focus mode theo screen reader.
4. Ghi lại đầu ra thực tế hoặc lưu log Speech Viewer; không thay bằng accessibility tree hay nội dung dự kiến dưới đây.

## Các thao tác cần ghi nhận

| Bước | Thao tác | Nội dung cần nghe/kiểm tra | Ghi nhận thực tế |
|---|---|---|---|
| 1 | Tab tới ô tìm kiếm | Tên “Filter team directory” và hướng dẫn bàn phím được nhận diện; không cần đọc nguyên văn giống nhau giữa các screen reader | Chưa chạy |
| 2 | Tab vào grid rồi di chuyển bằng mũi tên trái/phải/lên/xuống | Tên grid, tiêu đề cột khi đi qua ô, tên ô và quan hệ hàng/cột nhận biết được; focus di chuyển trong grid | Chưa chạy |
| 3 | Tab tới sort button; Enter rồi Space | Trạng thái sort tăng/giảm được nhận biết sau mỗi hành động; dấu chỉ hướng hoặc aria-sort không làm tên nút khó hiểu | Chưa chạy |
| 4 | Focus vào ô dữ liệu; Enter chọn dòng, Space bỏ chọn | Trạng thái dòng chọn/bỏ chọn có thể nhận biết; nội dung status không yêu cầu đổi focus | Chưa chạy |
| 5 | Lọc `Engineering`, sau đó chuỗi không khớp | Số kết quả/trạng thái trang được thông báo; trạng thái rỗng có nội dung rõ và focus hợp lý | Chưa chạy |
| 6 | Chuyển trang bằng Enter và Space; lặp ở cả hai biên | Sau cập nhật, focus ở nút phân trang còn bật; thông báo trang nhận biết được; không thể vượt quá biên | Chưa chạy |
| 7 | Sau mỗi lần đổi trang, dùng Tab và Shift+Tab | Thứ tự focus tiếp tục hợp lý, indicator thấy được và người dùng ra/vào grid được | Chưa chạy |
| 8 | Focus dòng Maya rồi lọc để dòng đó biến mất; thử chuỗi không khớp | Khi ô cũ không còn hợp lệ, vị trí focus có đích đến hợp lệ; empty state trả focus về search theo hành vi hiện tại | Chưa chạy |
| 9 | Dùng bản local và tạm đổi `office` của một dòng trong `src/data/employees.ts` thành chuỗi dài 300 ký tự không có dấu ngắt | Screen reader đọc nội dung ô có thể hiểu; vùng bảng cuộn ngang riêng, trang không tràn ngang | Chưa chạy |
| 10 | Bản local: cập nhật dataset để xóa ID dòng đang focus rồi hot reload | Focus chuyển đến ô hợp lệ đầu tiên; nếu không còn dòng, focus về search; lựa chọn vẫn theo ID khi hàng đó còn tồn tại | Chưa chạy |

Lưu kết quả bằng cách điền cột cuối với trích đoạn/log Speech Viewer thực tế, ngày giờ và các phiên bản. Các câu trong cột “Nội dung cần nghe/kiểm tra” là mục tiêu quan sát, không phải transcript.
