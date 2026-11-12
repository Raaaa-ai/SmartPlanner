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
- 侧栏可收起为图标模式；设置中可开启「贴边自动隐藏」，窗口会隐藏到屏幕右侧下层，保留「今日」「待办」「项目」等竖排标签，鼠标移到标签上即可展开
- 修改代码后请先从托盘菜单「退出」旧实例，再重新运行，否则会看到旧界面
- 托盘菜单可打开工作台、快速记录、检查更新或退出

## 数据

- 默认数据目录：优先 `D:\SmartPlanner\data`，否则 `%APPDATA%\smartplanner\data`
- 主数据文件：`smartplanner.json`；自动备份保存在数据目录下的 `backups`
- 升级或卸载不会删除数据；升级前可在「设置 → 存储」导出一份备份

## 更新

- 设置页和托盘菜单都可以检查更新
- 新版本在后台下载，完成后提示重启安装
- 首次从 0.2.0 升级到 0.3.0 需要手动安装一次；之后版本可自动更新
- 从 0.2.0 升级时建议先卸载旧版本（数据会保留），避免两个安装目录并存

## 构建

```bash
npm run build       # 编译并检查类型
npm run build:win   # 生成 Windows 安装包
npm run release:win # 构建并发布到 GitHub Releases（需要 GH_TOKEN）
```

也可以推送 `v*` 标签，由 `.github/workflows/release.yml` 在 Windows 上自动构建并发布。
发布时请确保 tag 版本与 `package.json` 的 `version` 一致。
