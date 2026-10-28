// Original, reusable UI copy for common websites; no third-party website is scraped.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../examples/catalog/', import.meta.url));
const entities = [
 ['product','product','sản phẩm','商品'], ['order','order','đơn hàng','订单'], ['category','category','danh mục','分类'],
 ['customer','customer','khách hàng','客户'], ['address','address','địa chỉ','地址'], ['payment','payment','thanh toán','付款'],
 ['invoice','invoice','hóa đơn','发票'], ['coupon','coupon','mã giảm giá','优惠券'], ['shipment','shipment','lô hàng','货件'],
 ['account','account','tài khoản','账户'], ['profile','profile','hồ sơ','个人资料'], ['session','session','phiên đăng nhập','登录会话'],
 ['member','member','thành viên','成员'], ['role','role','vai trò','角色'], ['permission','permission','quyền truy cập','访问权限'],
 ['message','message','tin nhắn','消息'], ['notification','notification','thông báo','通知'], ['contact','contact','liên hệ','联系人'],
 ['article','article','bài viết','文章'], ['page','page','trang','页面'], ['comment','comment','bình luận','评论'],
 ['document','document','tài liệu','文档'], ['file','file','tệp','文件'], ['folder','folder','thư mục','文件夹'],
 ['attachment','attachment','tệp đính kèm','附件'], ['image','image','hình ảnh','图片'], ['video','video','video','视频'],
 ['project','project','dự án','项目'], ['task','task','công việc','任务'], ['ticket','ticket','yêu cầu hỗ trợ','支持工单'],
 ['event','event','sự kiện','活动'], ['booking','booking','đặt chỗ','预订'], ['service','service','dịch vụ','服务'],
 ['plan','plan','gói dịch vụ','服务套餐'], ['subscription','subscription','đăng ký dịch vụ','订阅'], ['receipt','receipt','biên nhận','收据'],
 ['report','report','báo cáo','报告'], ['form','form','biểu mẫu','表单'], ['field','field','trường dữ liệu','字段'],
 ['template','template','mẫu nội dung','内容模板'], ['setting','setting','cài đặt','设置'], ['integration','integration','tích hợp','集成'],
 ['webhook','webhook','webhook','网络钩子'], ['backup','backup','bản sao lưu','备份'], ['language','language','ngôn ngữ','语言'],
 ['translation','translation','bản dịch','翻译'], ['review','review','đánh giá','审核'], ['release','release','bản phát hành','发布版本'],
 ['sourceVersion','source version','phiên bản nguồn','源版本'], ['resource','resource','tài nguyên','资源']
];
const messages = [
 ['add','Add ITEM','Thêm ITEM','添加ITEM'], ['edit','Edit ITEM','Chỉnh sửa ITEM','编辑ITEM'],
 ['delete','Delete ITEM','Xóa ITEM','删除ITEM'], ['view','View ITEM','Xem ITEM','查看ITEM'],
 ['search','Search for ITEM','Tìm kiếm ITEM','搜索ITEM'], ['name','Name of ITEM','Tên ITEM','ITEM名称'],
 ['description','Description of ITEM','Mô tả ITEM','ITEM描述'], ['details','Details of ITEM','Chi tiết ITEM','ITEM详情'],
 ['empty','No ITEM found','Không tìm thấy ITEM','未找到ITEM'],
 ['loading','Loading ITEM, please wait','Đang tải ITEM, vui lòng chờ','正在加载ITEM，请稍候'],
 ['created','The ITEM was created successfully','Đã tạo ITEM thành công','已成功创建ITEM'],
 ['updated','The ITEM was updated successfully','Đã cập nhật ITEM thành công','已成功更新ITEM'],
 ['deleted','The ITEM was deleted successfully','Đã xóa ITEM thành công','已成功删除ITEM'],
 ['confirmDelete','Are you sure you want to delete this ITEM?','Bạn có chắc muốn xóa ITEM này?','确定要删除此ITEM吗？'],
 ['save','Save changes to this ITEM','Lưu thay đổi cho ITEM này','保存此ITEM的更改'],
 ['required','Please select a ITEM before continuing','Vui lòng chọn ITEM trước khi tiếp tục','请先选择ITEM再继续'],
 ['unavailable','This ITEM is currently unavailable','ITEM này hiện không khả dụng','此ITEM当前不可用'],
 ['permission','You do not have permission to edit this ITEM','Bạn không có quyền chỉnh sửa ITEM này','您无权编辑此ITEM'],
 ['unsaved','This ITEM has unsaved changes','ITEM này có thay đổi chưa được lưu','此ITEM有未保存的更改'],
 ['retry','Unable to load this ITEM. Please try again','Không thể tải ITEM này. Vui lòng thử lại','无法加载此ITEM，请重试']
];
const base = {
 en: { app: { title: 'Everyday Web', subtitle: 'Manage your work in one place' }, home: { title: 'Welcome home', welcome: 'Hello {name}', courses: 'You have {count} tasks today' }, actions: { save: 'Save changes', cancel: 'Cancel', submit: 'Continue' }, menu: { home: 'Home', profile: 'My profile' } },
 vi: { app: { title: 'Website thường ngày', subtitle: 'Quản lý công việc tại một nơi' }, home: { title: 'Chào mừng trở lại', welcome: 'Xin chào {name}', courses: 'Bạn có {count} công việc hôm nay' }, actions: { save: 'Lưu thay đổi', cancel: 'Hủy', submit: 'Tiếp tục' }, menu: { home: 'Trang chủ', profile: 'Hồ sơ của tôi' } },
 zh: { app: { title: '日常网站', subtitle: '在一个地方管理您的工作' }, home: { title: '欢迎回来', welcome: '你好 {name}', courses: '您今天有{count}项任务' }, actions: { save: '保存更改', cancel: '取消', submit: '继续' }, menu: { home: '首页', profile: '我的资料' } }
};
function flatten(data) { return Object.values(data).flatMap(value => typeof value === 'string' ? [value] : flatten(value)); }
const summary = [];
for (const [dataset, selected] of [['common-web', entities], ['student-portal', entities.filter(item => ['account', 'profile', 'member', 'message', 'notification', 'document', 'event', 'task'].includes(item[0]))]]) {
 const directory = path.join(root, dataset); mkdirSync(directory, { recursive: true });
 const stats = {};
 for (const [index, locale] of ['en', 'vi', 'zh'].entries()) {
   const data = structuredClone(base[locale]); data.website = {};
   for (const [key, ...names] of selected) {
     data.website[key] = {};
     for (const [message, ...templates] of messages) {
       let translated = templates[index].replaceAll('ITEM', names[index]);
       if (locale === 'en' && message === 'required') translated = 'Please select ' + (/^[aeiou]/i.test(names[0]) ? 'an ' : 'a ') + names[0] + ' before continuing';
       data.website[key][message] = translated;
     }
   }
   const values = flatten(data); stats[locale] = { keys: values.length, words: values.join(' ').match(/[\p{L}\p{N}]+/gu)?.length || 0 };
   writeFileSync(path.join(directory, locale + '.json'), JSON.stringify(data, null, 2) + '\n');
   const v2 = structuredClone(data);
   v2.home.welcome = { en: 'Welcome {name}. You have {count} updates', vi: 'Chào mừng {name}. Bạn có {count} cập nhật', zh: '欢迎{name}，您有{count}条更新' }[locale];
   delete v2.actions.cancel;
   v2.home.help = { en: 'Visit the help center', vi: 'Truy cập trung tâm trợ giúp', zh: '访问帮助中心' }[locale];
   writeFileSync(path.join(directory, locale + '.v2.json'), JSON.stringify(v2, null, 2) + '\n');
 }
 summary.push({ dataset, stats });
}
writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ description: 'Original generic UI translations, reusable for the BTL and sample websites. Human review recommended before production.', sourceLocale: 'en', locales: ['en', 'vi', 'zh'], datasets: summary }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
