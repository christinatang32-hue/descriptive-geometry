# 学情与作业批改服务（Cloudflare Worker + D1 + R2 + Workers AI）

网站仍由 GitHub Pages 发布；此服务保存学习记录和作业照片，并调用视觉模型对照标准答案图作 AI 初评。网页中的“登录”是学号与姓名登记，不接入学校统一身份认证，因此无法防止代填或冒用。AI 对纸质作图照片的判断也可能漏检或误判，批改意见用于学习反馈，不宜直接当作正式成绩。

## 上线前

1. 在 Cloudflare 创建 D1 数据库 `descriptive-geometry-learning` 和私有 R2 bucket `descriptive-geometry-submissions`。把数据库 ID 填入 `wrangler.example.jsonc` 的副本 `wrangler.jsonc`；其中已配置 R2 与 Workers AI 绑定。
2. 用 Wrangler 执行 `schema.sql` 创建学生名单、登录、学习时长和作业提交表。若数据库已存在，重复执行该文件即可添加新表。
3. 先发布本仓库中的 `answer-references/*.png` 与习题页。Worker 通过 `COURSE_BASE_URL` 从可信课程站点读取标准答案图与题目，不采用学生提交的“标准答案”。
4. 用 Wrangler secret 设置长随机 `ADMIN_TOKEN`，部署 Worker。不要把密钥写入仓库、网页或 URL。
5. 将 Worker 的 HTTPS 地址写入 `publish/config.js` 的 `apiBase`，再次发布网站。在 `admin.html` 输入教师密钥，按届别上传含“学号、姓名”两列的 UTF-8 CSV 名单。
6. 用真实照片逐题验证 AI 对线条、点位、可见性和多解的反馈，并检查标注框落在学生照片上的正确位置，再向学生开放作业批改。

可参考命令：

```text
npx wrangler d1 create descriptive-geometry-learning
npx wrangler r2 bucket create descriptive-geometry-submissions
npx wrangler d1 execute descriptive-geometry-learning --remote --file schema.sql
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

`wrangler.jsonc` 应使用实际数据库 ID，且不要提交任何访问密钥。Worker 用 `ALLOWED_ORIGIN` 限制网页来源，默认与本站的 GitHub Pages 域名一致。教师统计页的密钥只存在于当前输入框，不写入浏览器存储。D1 保存名单、登录、学习时长与批改意见；学生上传的照片存放于私有 R2，不公开直链，读取时核对当前学生会话。照片会发送给 Cloudflare Workers AI 视觉模型作即时初评。系统不采集 IP 地址或鼠标轨迹。名单比对只核实所填信息与名单一致，不能证明当前操作者就是该学生。

客户端每约 15 秒上传一次正在前台、获得焦点且未闲置的学习时间；闲置超过 2 分钟停止累计。网络中断或浏览器强制结束可能使最后一小段时间未被记录，因此统计是“有效学习时长估计”，不是精确在场证明。

学习记录以每次登录时间为起点保留三年，学生名单以最近一次上传时间为起点保留三年，作业照片与批改意见自提交之日起保留三年。Worker 的 Cron Trigger 每日 18:00 UTC（北京时间次日 02:00）删除超期记录与 R2 照片，并删除没有剩余记录的学生身份；教师读取统计时也先执行同一清理。上线前还应向学生说明课程记录的管理人及更正/删除方式。
