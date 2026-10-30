# IELTS Desk — v1.3.0

Góc học IELTS local cho Chrome/Edge: lưu từ trong ngữ cảnh, tổ chức sổ từ, ôn flashcard và giữ các bài viết riêng. Dữ liệu nằm trên thiết bị; không cần tài khoản hoặc backend.

## Cài hoặc cập nhật

1. Mở `chrome://extensions` hoặc `edge://extensions`, bật Developer mode.
2. Chọn **Load unpacked** và trỏ tới thư mục dự án. Nếu đã cài, bấm **Reload** trên thẻ IELTS Desk.
3. Tải lại dashboard và các website đang mở để dùng code mới.

Dữ liệu v1.1/v1.2 được chuyển tự động sang schema 3. Các nhóm dạng tên cũ trở thành nhóm có ID; giữ nguyên từ và lịch ôn. Bản nháp Writing cũ nằm ở bài **Bản nháp hiện tại**. Trạng thái đã học được giữ dựa trên lịch sử ôn có sẵn. Bản dữ liệu trước chuyển đổi cũng được giữ nội bộ trong `migrationBackup`.

## Lưu và tổ chức từ

- Popup: nhập từ để lưu nhanh. Nếu đã có, extension báo trùng và cho mở từ cũ.
- Website: bôi đen từ/cụm từ rồi dùng nút nổi hoặc menu chuột phải **Lưu vào IELTS Desk**. Nút nổi giữ câu gốc và nguồn; menu chuột phải cố lấy ngữ cảnh khi trang cho phép truy cập.
- Từ trùng được nhận diện sau khi chuẩn hóa hoa/thường và khoảng trắng. Không tạo thêm bản ghi; các nguồn/ngữ cảnh mới được ghép. Nghĩa cũ không bị ghi đè.
- Tạo chủ đề và nhóm ở **Chủ đề & nhóm** hoặc nút trên sổ từ. Mỗi từ có một nhóm chính, một chủ đề và nhiều tag. Nhóm có thể độc lập; tên nhóm là duy nhất trong thư viện. Mở nhóm để thêm từ được điền sẵn nơi lưu hoặc **Ôn nhóm**. Trong form sửa từ, thêm nghĩa, chọn nhóm/chủ đề và tag cách nhau bằng dấu phẩy. Phần **Ngữ cảnh, ví dụ & nguồn** chứa câu gốc, ví dụ tự viết và nguồn web/sách.
- **Thêm nhiều từ**: dán `từ | nghĩa` hoặc hai cột phân cách bằng tab, mỗi dòng một từ (tối đa 500 dòng). Xem trước, sửa từng dòng rồi xác nhận. Từ trùng được ghép, giữ nghĩa đã lưu. Nếu một dòng không hợp lệ thì cả lần nhập không ghi dở dang.
- Chọn nhiều từ → **Chuyển nhóm**, hoặc ôn riêng các từ đã chọn.
- Tìm kiếm bao gồm từ, nghĩa, câu gốc, ví dụ, chủ đề, nhóm và tag. Lọc theo chủ đề/nhóm/tag, đến lịch ôn hoặc chưa có nghĩa; sắp xếp theo tên/ngày lưu/lịch ôn. Bộ lọc được giữ khi chuyển màn và mở lại.
- Lọc ngày chọn rõ **Ngày thêm / Ngày ôn gần nhất / Hạn ôn**, rồi chọn hôm nay, hôm qua, 7 ngày qua, tháng này hoặc khoảng tùy chọn. Ngày theo múi giờ thiết bị; ngày kết thúc bao gồm cả ngày. Từ chưa từng ôn không khớp bộ lọc ngày ôn. Chip hiển thị bộ lọc đang áp dụng và cho bỏ từng điều kiện.
- Xóa chủ đề/nhóm có xác nhận; từ và ghi chú vẫn được giữ, chỉ bỏ liên kết tương ứng.

## Ghi chú

- **Ghi chú** là notebook riêng, không trộn với bản nháp Writing. Có tiêu đề, nội dung văn bản, chủ đề, nhóm, kỹ năng, ghim và liên kết đến các từ trong thư viện.
- **Ghi chú hôm nay** tạo hoặc mở lại ghi chú cùng ngày. Những ghi chú khác có thể tạo độc lập.
- Xem theo chủ đề hoặc ngày tạo; tìm nội dung, lọc chủ đề/nhóm/kỹ năng và ngày tạo/ngày sửa.
- Tự lưu sau 500 ms, trạng thái lưu hiển thị ngay trong editor; **Lưu ngay** để thử lại khi có lỗi. Có bộ đệm khôi phục khi lần ghi chưa hoàn tất. Xóa có hoàn tác và thùng rác.
- Notebook là plain text; không gửi nội dung đi và không có chấm điểm AI.

## Dữ liệu nằm ở đâu?

**Bản extension đã cài:** `chrome.storage.local`, thuộc profile Chrome/Edge và ID extension. Dữ liệu không nằm trong thư mục source code, không phải một file JSON tự tạo và chưa đồng bộ cloud. Đóng trình duyệt hoặc reload/cập nhật cùng ID vẫn giữ dữ liệu. Gỡ extension, xóa profile hoặc cài dưới ID khác sẽ mất hoặc không truy cập được vùng dữ liệu cũ. Hãy xuất backup trước các thao tác này.

**Bản web preview:** `localStorage` theo origin (giao thức + host + port). Đây là kho riêng, tách biệt với bản extension. Đổi từ `localhost` sang `127.0.0.1` cũng là origin khác. Không xóa site data nếu chưa sao lưu.

Vào **Dữ liệu & tùy chọn → Xuất bản sao lưu** để tải file JSON có thể mang sang máy khác.

## Ôn tập

- **Đến lịch ôn**: chọn nhóm/tag, số thẻ, thứ tự trộn hoặc theo lịch.
- **Ôn tự do**: học lại từ chưa đến hạn. Mặc định giữ lịch hiện tại; có thể bật **Cập nhật lịch ôn theo kết quả**.
- Từ danh sách, tích các từ rồi nhấn **Ôn X từ có nghĩa** để luyện riêng. Chế độ này giữ lịch ôn.
- Từ chưa có nghĩa được loại khỏi hàng đợi; bổ sung nghĩa trước khi học.
- Phím Space lật thẻ; phím 1 chọn **Cần ôn lại**, phím 2 chọn **Mình nhớ rồi**. Có thể bỏ qua một thẻ.
- Khi cập nhật lịch: các lần nhớ tốt liên tiếp giãn theo 1–3–7–14–30–60 ngày; quên hẹn lại sau 30 phút. Đây là lịch tiến triển đơn giản, không phải thuật toán SRS thích nghi.
- Trạng thái tách riêng **Cần thêm nghĩa / Chưa học / Đang học / Đã nhớ**. Quên một thẻ không làm mất số lượt đã học.

## Writing

Mỗi bài có tiêu đề, loại Task 1/Task 2, đề, nội dung và checklist riêng. Tạo bài mới bằng đề mẫu hoặc đề tự nhập; chuyển bài bằng danh sách chọn. Nội dung/checklist tự lưu, có bộ đệm local để khôi phục khi lần lưu trước chưa hoàn tất. Dùng **Lưu ngay** khi cần xác nhận lưu trước khi rời máy. Bài không được chấm tự động.

## Dữ liệu & tùy chọn

- **Xuất bản sao lưu**: tải JSON gồm từ, ngữ cảnh, chủ đề/nhóm/tag, ghi chú/liên kết từ, lịch sử ôn, bài viết, checklist và thùng rác.
- **Nhập bản sao lưu**: xem trước rồi xác nhận ghép. Nghĩa đang có được giữ, chỗ trống được điền, ngữ cảnh/tag được ghép, lịch ôn mới hơn được ưu tiên. Bài viết hoặc ghi chú cùng ID nhưng khác nội dung được giữ thành bản riêng. Quan hệ chủ đề/nhóm/từ được ánh xạ khi ghép với dữ liệu máy khác. Nhập lại cùng bản không nhân đôi lịch sử.
- Trước khi ghép, lưu một điểm khôi phục. Nút **Khôi phục** có bước xác nhận và cho tải bản hiện tại trước khi thay.
- Xóa từ, ghi chú hoặc bài viết sẽ chuyển vào **Thùng rác**; hoàn tác qua thông báo hoặc khôi phục tại đây. Dữ liệu xóa trước v1.2 không có trong thùng rác mới.
- Bật/tắt **Nút lưu khi bôi đen** trong popup hoặc trang tùy chọn. Bật cần quyền website. Tắt gỡ nút trên các tab đã nhận script; menu chuột phải vẫn hoạt động.
- Website loại trừ: mỗi dòng một tên miền, áp dụng cả tên miền con. Chỉ ảnh hưởng nút nổi.

Các thao tác ghi từ popup/dashboard/capture được xử lý nối tiếp trong background. Không ghi lại nội dung trang khi bạn không chủ động chọn và lưu.

## Preview và kiểm tra khi phát triển

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8765/dashboard.html` hoặc `/popup.html`. Preview dùng localStorage riêng theo origin, không ghi vào dữ liệu extension. Web Locks được dùng để nối tiếp thao tác giữa các tab preview nếu trình duyệt hỗ trợ.

Kiểm tra logic không cần package runtime:

```sh
node work/check-runtime.mjs
node work/check-organization.mjs
```

Kiểm tra tương tác DOM (dependency kiểm thử riêng, không đưa vào extension):

```sh
npm install --prefix /tmp/ielts-desk-qa-deps --ignore-scripts --no-audit --no-fund jsdom@26.1.0
node work/check-ui.mjs
```

## Thiết kế và cấu trúc

- `model.js`: schema, chuyển dữ liệu, lệnh ghi, lịch ôn và nhập/xuất.
- `service-worker.js`: hàng đợi ghi duy nhất, menu chuột phải và đăng ký nút nổi.
- `common.js`: cầu nối storage/RPC, SVG và hàm UI chung.
- `dashboard.js`, `popup.js`: các luồng giao diện.
- `organization.js`: chủ đề, nhóm, nhập nhiều từ, notebook và bộ lọc ngày.
- `capture-utils.js`, `content.js`: lấy câu gốc và nút lưu cạnh vùng chọn.

UI giữ hệ đỏ/trung tính và font Be Vietnam Pro local. Giấy phép font nằm tại `public/fonts/OFL.txt`. Không tải font hay tài nguyên từ mạng khi sử dụng.
