# 学情与作业批改服务（Cloudflare Worker + D1 + R2 + Workers AI）

网站仍由 GitHub Pages 发布；此服务保存学习记录和作业照片，并调用视觉模型对照标准答案图作 AI 初评。学生首次注册时核对教师上传名单中的学号、姓名和班级，再设置 6–10 个字符的密码；手机号选填，填写后只保存而不验证归属。教师使用单独生成的初始密码，首次登录必须修改；教师新密码仍须至少 10 个字符。AI 对纸质作图照片的判断也可能漏检或误判，批改意见用于学习反馈，不宜直接当作正式成绩。

## 上线前

1. 在 Cloudflare 创建 D1 数据库 `descriptive-geometry-learning` 和私有 R2 bucket `descriptive-geometry-submissions`。把数据库 ID 填入 `wrangler.example.jsonc` 的副本 `wrangler.jsonc`；其中已配置 R2 与 Workers AI 绑定。
2. 用 Wrangler 执行 `schema.sql` 创建教师名单、教师密码、学生名单、学生账号、学习时长和作业提交表。若数据库已存在，重复执行该文件即可添加新表。首位管理员账号由维护者写入 `teacher_accounts` 和 `teacher_credentials`，并设置 `is_admin=1`；之后由管理员在教师学情统计页面添加教师。新教师的初始密码只在创建成功的响应中显示一次，数据库仅保存带独立盐值的 PBKDF2-HMAC-SHA512 哈希，首次登录必须改密。

已有授课班级表的部署需执行一次 `migrations/2026-11-06-teaching-term.sql`，为授课班级补充学年、学期和学生原表行序。旧名单的学年学期、授课班级名称与行序应按对应教学记录表核对后回填。
已有教师账号的部署需执行一次 `migrations/2026-11-06-teacher-admin.sql`，仅把经确认的唐玉账号 `2017011104` 授予管理员权限。
3. 先发布本仓库中的 `answer-references/*.png` 与习题页。Worker 通过 `COURSE_BASE_URL` 从可信课程站点读取标准答案图与题目，不采用学生提交的“标准答案”。
4. 部署 Worker。教师用工号、姓名和初始密码在统一登录页登录，改密后才可查看统计和上传名单。学生必须先凭名单中的学号、姓名和班级注册，之后凭学号、姓名和密码登录。
5. 将 Worker 的 HTTPS 地址写入网站根目录 `config.js` 的 `apiBase`，再次发布网站。教师登录后在 `admin.html` 直接上传教学系统导出的 `.xlsx` 或 `.xls` 记录表。系统识别“学号、姓名、班级”三列并跳过空行和汇总行；无需将原文件转换为模板。上传时填写授课学年、学期；系统按主修年级的行政班级命名授课班级，重修学生保留在名单内，学生行序沿用 Excel。教师也可选择授课班级后手动添加学生，未选择时按学生行政班级自动建立。统计先按授课学年/学期，再按授课班级调取。
6. 用真实照片逐题验证 AI 对线条、点位、可见性和多解的反馈，并检查标注框落在学生照片上的正确位置，再向学生开放作业批改。

可参考命令：

```text
npx wrangler d1 create descriptive-geometry-learning
npx wrangler r2 bucket create descriptive-geometry-submissions
npx wrangler d1 execute descriptive-geometry-learning --remote --file schema.sql
npx wrangler deploy
```

`wrangler.jsonc` 应使用实际数据库 ID。Worker 用 `ALLOWED_ORIGIN` 限制网页来源，默认与本站的 GitHub Pages 域名一致。师生会话令牌只存在于浏览器当前标签页的 `sessionStorage`，教师统计与名单上传接口均在服务端核验教师会话。D1 保存名单、带盐密码哈希、学生登记的手机号、登录、学习时长与批改意见；学生上传的照片存放于私有 R2，不公开直链，读取时核对当前学生会话。照片会发送给 Cloudflare Workers AI 视觉模型作即时初评。系统不采集 IP 地址或鼠标轨迹。因为名单没有手机号，注册时不能证明填表者本人就是该学生；如需防止抢先注册，应另接短信验证或由学校身份认证确认。

客户端每约 15 秒上传一次正在前台、获得焦点且未闲置的学习时间；闲置超过 2 分钟停止累计。网络中断或浏览器强制结束可能使最后一小段时间未被记录，因此统计是“有效学习时长估计”，不是精确在场证明。

学习记录以每次登录时间为起点保留五年，学生名单与授课班级以最近一次更新为起点保留五年，作业照片与批改意见自提交之日起保留五年。Worker 的 Cron Trigger 每日 18:00 UTC（北京时间次日 02:00）删除超期记录与 R2 照片，并删除没有剩余记录的学生身份；教师读取统计时也先执行同一清理。上线前还应向学生说明课程记录的管理人及更正/删除方式。
