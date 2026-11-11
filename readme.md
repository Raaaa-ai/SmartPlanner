# SmartPlanner

本地优先的 Windows 个人工作台（Electron + React + TypeScript）。

## 运行

```bash
npm install
npm run dev
```

- 按 `Ctrl + Alt + Space` 呼出快速记录
- 关闭主窗口后应用仍在系统托盘运行
- 右上角图钉用于固定窗口位置，固定后无法拖动，再次点击解除
- 修改代码后请先从托盘菜单「退出」旧实例，再重新运行，否则会看到旧界面
- 托盘菜单可打开工作台、快速记录或退出

## 构建

```bash
npm run build      # 编译并检查类型
npm run build:win  # 生成 Windows 安装包（建议在 Windows 上执行）
```
