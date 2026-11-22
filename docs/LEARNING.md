# Code walkthrough / 代码讲解

## Record versus file / 投稿与照片

中文：照片保存在 DeepSpace 文件存储里，投稿只保存 `photoKey`、文字和审核字段。上传成功不等于投稿已提交；点击 Submit 才创建记录。

English: Storage holds the image. A submission holds its key, caption and review fields. Uploading a photo does not submit an entry.

## TypeScript status / 固定状态

```ts
type ReviewStatus = 'pending' | 'approved' | 'needs_revision'
```

中文：`|` 表示只能是这些值之一，帮助编辑器发现拼写错误。类型在运行时不会保护后端，所以 action 仍检查状态是否合法。

English: The union catches spelling mistakes during development. The server still validates the value at runtime.

## Authorization / 后端权限

中文：隐藏按钮只是界面行为。集合禁止直接写入，审核 action 用已验证的用户 ID 查询后端角色。只有 admin 能审核，退回必须有反馈。重投还会检查记录的 createdBy。

English: Hiding a button is not security. Direct record writes are denied. The review action checks the verified caller's role. Revision checks record ownership.

## Realtime / 实时同步

中文：`useQuery` 订阅记录。action 保存后，DeepSpace 把允许查看的变化推送到原来打开的页面。我们的代码没有定时刷新。

English: `useQuery` subscribes to records. DeepSpace pushes authorized changes after a server write; no polling or page reload is needed.

## Async and failure / 等待与报错

中文：`await` 等待上传或 action 结果。`try/catch` 显示失败信息，`finally` 解除按钮的忙碌状态。网络失败时不应假装保存成功。

English: `await` waits for the result. `catch` reports failure. `finally` clears the busy state. A failed request must not look like a successful save.

## AI / 可选建议

中文：只发原文给 AI。建议单独显示，只有 Use suggestion 才修改输入框。AI 失败不影响原文投稿；事实是否正确仍由人确认。

English: AI receives only text. A suggestion is separate from the draft until the user accepts it. AI failure does not block submitting the original.

## A small live change / 面试现场小修改

把文字上限从 500 改成 400：前端 textarea 的 maxLength、字数提示，以及后端 captionValue 的限制都要同步修改；然后测试 400 字能提交、401 字的直接 API 请求被后端拒绝。不要只改前端。

To reduce captions to 400 characters, update both the form limit and server validation. Test the boundary and a forged oversized request.

## Common debugging / 常见排查

- Port in use：已有开发服务在运行；查看原终端，不要反复启动。 / Check the existing server before starting another.
- Upload 401：确认应用内登录和平台 identity 配置；终端登录与网页登录不同。 / Browser and CLI sessions are separate.
- No records：先看 query 的 loading/error 状态，再看当前角色和 createdBy。 / Check query state, role and ownership.
- Review denied：确认当前账号是 editor/admin，不要在浏览器传 role 试图绕过。 / Verify the server-side role.
- Local works, live old：保存文件只更新本地；线上需要 deploy。 / Hot updates affect local development; production needs deployment.

这些是学习材料；不要在面试中声称已经亲自验证过尚未操作的部分。
These notes are preparation, not evidence of personal testing.
