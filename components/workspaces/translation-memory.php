<div>
    <h2 class="text-lg font-semibold text-gray-900">Kho bản dịch dùng chung</h2>
    <p class="text-sm text-gray-500 mt-1">Tra cứu nội dung giao diện đã có bằng tiếng Việt và chọn ngôn ngữ đích. Tên người dịch không hiển thị.</p>
</div>
<form id="memory-filter" class="workflow-card flex flex-wrap items-end gap-3">
    <div class="flex-1 min-w-60">
        <label for="memory-query" class="workflow-label">Tìm câu tiếng Việt hoặc bản dịch</label>
        <input id="memory-query" maxlength="200" autocomplete="off" placeholder="Nhập nội dung cần tìm..." class="workflow-input">
    </div>
    <div class="w-full sm:w-64">
        <label for="memory-language" class="workflow-label">Ngôn ngữ cần dịch</label>
        <select id="memory-language" required class="workflow-input"><option value="">Đang tải ngôn ngữ...</option></select>
    </div>
    <button type="submit" class="workflow-primary">Tìm kiếm</button>
</form>
<p id="memory-status" role="status" class="text-sm text-gray-500">Đang tải kho bản dịch...</p>
<button id="memory-retry" type="button" class="hidden text-sm text-indigo-700 underline">Tải lại danh sách ngôn ngữ</button>
<section class="workflow-card p-0 table-responsive">
    <table class="w-full text-left">
        <thead><tr><th>Tiếng Việt</th><th id="memory-target-heading">Bản dịch</th><th>Thao tác</th></tr></thead>
        <tbody id="memory-results"></tbody>
    </table>
    <div class="p-4 flex items-center justify-between border-t border-gray-100">
        <button id="memory-previous" type="button" class="text-indigo-600 disabled:opacity-40" disabled>Trước</button>
        <span id="memory-page" class="text-sm text-gray-500">Trang 1</span>
        <button id="memory-next" type="button" class="text-indigo-600 disabled:opacity-40" disabled>Sau</button>
    </div>
</section>
<section id="memory-detail" class="hidden workflow-card space-y-4" aria-live="polite">
    <div><h3 class="font-semibold text-gray-900">Bản dịch đã chọn</h3><p class="text-xs text-gray-500 mt-1">Tiếng Việt → <span id="memory-detail-language"></span></p></div>
    <div><h4 class="text-sm font-medium text-gray-600 mb-1">Tiếng Việt</h4><p id="memory-source-text" class="whitespace-pre-wrap"></p></div>
    <div><h4 class="text-sm font-medium text-gray-600 mb-1">Bản dịch</h4><p id="memory-target-text" class="whitespace-pre-wrap"></p></div>
    <button id="memory-copy" type="button" class="workflow-primary">Sao chép bản dịch</button>
</section>
