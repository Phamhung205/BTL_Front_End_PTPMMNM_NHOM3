<?php
/**
 * Modal Component - Translation Manager
 * Modal dùng chung cho Add Member, Confirm Action, v.v.
 */
?>
<!-- Generic Modal Template -->
<div id="modal-backdrop" class="hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onclick="closeModal()"></div>
<div id="modal-container" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all" onclick="event.stopPropagation()">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 id="modal-title" class="text-lg font-semibold text-gray-900">Modal Title</h3>
            <button onclick="closeModal()" class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        <!-- Modal Body -->
        <div id="modal-body" class="px-6 py-4">
            <!-- Dynamic content -->
        </div>
        <!-- Modal Footer -->
        <div id="modal-footer" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Hủy</button>
            <button id="modal-confirm-btn" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Xác nhận</button>
        </div>
    </div>
</div>

<!-- Confirm Dialog -->
<div id="confirm-backdrop" class="hidden fixed inset-0 bg-black bg-opacity-50 z-40"></div>
<div id="confirm-dialog" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div class="p-6">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
            </div>
            <h3 id="confirm-title" class="text-lg font-semibold text-gray-900 text-center mb-2">Xác nhận</h3>
            <p id="confirm-message" class="text-sm text-gray-600 text-center">Bạn có chắc chắn muốn thực hiện hành động này?</p>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button onclick="closeConfirmDialog()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Hủy</button>
            <button id="confirm-action-btn" class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Xác nhận</button>
        </div>
    </div>
</div>
