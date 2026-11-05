# 《画法几何及工程制图》学习平台

新项目仓库：<https://github.com/christinatang32-hue/descriptive-geometry>。课程页面使用 GitHub Pages 从 `main` 分支根目录发布，目标地址为 <https://christinatang32-hue.github.io/descriptive-geometry/>。

`index.html` 是课程封面与学习登记；登录后的 `catalog.html` 设讲义、例题、习题、专题四个模块。现有内容为 1 份讲义、66 道习题、2 个互动例题和涵洞专题链接；钢屋架、钢筋混凝土T形梁、房屋建筑内容待补充。使用 GitHub Pages 从 main 分支根目录发布。涵洞专题在另一个网站打开，其站内学习时长目前不纳入本平台统计。

`config.js` 的 `apiBase` 留空时，仅能演示登记和浏览，**不会向教师上传访问记录，也不会核对学生名单**。需要班级学情统计时，先按 `analytics-worker/README.md` 部署独立的记录服务，再填入 Worker 地址。之后在 `admin.html` 用教师密钥按届别上传学生名单，名单匹配的学号与姓名才能建立学习记录。

习题页增加“上传作业→查看结果→开始学习”流程。服务接入后，照片上传至私有 R2，由 Workers AI 对照 `answer-references/` 中的标准结果图即时初评；学生查看批改结果后才解锁页面上的分步作图。服务未接入时仅提供明确标注的本地演示入口，不进行真实批改。照片批改是学习反馈，需用真实作业测试其准确性。

新增或重新导出课程页面后运行 `node tools/instrument-pages.mjs` 和 `node tools/sync-catalog.mjs`，统一维护左上角“首页”链接、习题流程、学习时长脚本与课程目录。习题最终作图改变后，须用 `tools/build-answer-references.cjs` 重新生成相应标准答案图；该脚本需 Playwright 及本地静态预览服务。发布页面和原题源文件是两套内容；重新导出题页后也须重新运行上述脚本。
