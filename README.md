# 🎌 虚拟漫展策划平台

一个完整的全栈虚拟漫展管理系统，支持主办方创建展会、摊主入驻、粉丝逛展。

## ✨ 功能特性

### 🎪 主办方功能
- 创建和管理漫展，填写展会名称、举办时间、简介
- 添加摊位分区（同人区、周边贩售区、自由舞台区等
- 查看和管理摊位申请（审核通过/拒绝）
- 添加活动时间表

### 🛒 摊主功能
- 申请入驻展会
- 填写摊位名称、售卖内容、位置偏好
- 查看申请状态

### 👥 参观者功能
- 浏览展会详情
- 查看摊位地图和列表
- 收藏感兴趣的摊位
- 展会结束后给摊位打分评价
- 查看活动时间表

## 🛠️ 技术栈

### 后端 (端口: 8219
- Node.js + Express
- MongoDB + Mongoose
- JWT 认证
- bcryptjs 密码加密

### 前端 (端口: 8218)
- React 18
- React Router
- Axios
- Tailwind CSS
- Vite

## 📦 项目结构

```
gb-117/
├── backend/                 # 后端服务
│   ├── models/                # 数据模型
│   │   ├── User.js            # 用户模型
│   │   ├── Expo.js            # 展会模型
│   │   ├── Booth.js           # 摊位模型
│   │   ├── Schedule.js        # 活动时间表模型
│   │   ├── Favorite.js        # 收藏模型
│   │   └── Review.js          # 评价模型
│   ├── routes/                # 路由
│   │   ├── auth.js            # 认证路由
│   │   ├── expos.js           # 展会路由
│   │   ├── booths.js          # 摊位路由
│   │   ├── schedules.js      # 活动路由
│   │   ├── favorites.js      # 收藏路由
│   │   └── reviews.js         # 评价路由
│   ├── middleware/            # 中间件
│   │   └── auth.js         # JWT 认证中间件
│   ├── server.js            # 服务器入口
│   └── package.json         # 依赖配置
│
└── frontend/               # 前端应用
    ├── src/
    │   ├── contexts/        # React Context
    │   │   └── AuthContext.jsx  # 认证上下文
    │   ├── pages/          # 页面组件
    │   │   ├── Home.jsx          # 首页
    │   │   ├── Login.jsx         # 登录页
    │   │   ├── Register.jsx     # 注册页
    │   │   ├── CreateExpo.jsx   # 创建展会
    │   │   ├── ExpoDetail.jsx   # 展会详情
    │   │   ├── ExpoMap.jsx       # 展位地图
    │   │   ├── BoothApplication.jsx # 摊位申请
    │   │   ├── BoothDetail.jsx    # 摊位详情
    │   │   ├── BoothReview.jsx # 摊位审核(管理员)
    │   │   └── SchedulePage.jsx # 活动时间表
    │   ├── components/
    │   │   └── Layout.jsx       # 布局组件
    │   ├── api/
    │   │   └── index.js         # API 配置
    │   ├── main.jsx            # 应用入口
    │   ├── App.jsx             # 路由配置
    │   └── index.css          # 全局样式
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

## 🚀 快速开始

### 前置要求
- Node.js
- MongoDB

### 启动后端

```bash
cd backend
npm install
npm start
# 后端服务运行在 http://localhost:8219
```

### 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端应用运行在 http://localhost:8218
```

## 📝 API 接口

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 展会
- `GET /api/expos` - 获取所有展会
- `GET /api/expos/:id` - 获取单个展会详情
- `POST /api/expos` - 创建展会 (需要认证
- `PUT /api/expos/:id/zones` - 添加分区
- `PUT /api/expos/:id/zones/:zoneId` - 更新分区
- `DELETE /api/expos/:id/zones/:zoneId` - 删除分区

### 摊位
- `GET /api/booths/expo/:expoId` - 获取展会的摊位
- `GET /api/booths/pending` - 获取待审核摊位 (管理员)
- `GET /api/booths/:id` - 获取摊位详情
- `POST /api/booths` - 申请摊位
- `PUT /api/booths/:id/approve` - 通过摊位申请
- `PUT /api/booths/:id/reject` - 拒绝摊位申请

### 活动时间表
- `GET /api/schedules/expo/:expoId` - 获取展会活动
- `POST /api/schedules` - 添加活动
- `PUT /api/schedules/:id` - 更新活动
- `DELETE /api/schedules/:id` - 删除活动

### 收藏
- `GET /api/favorites/my` - 我的收藏
- `GET /api/favorites/expo/:expoId` - 展会收藏状态
- `POST /api/favorites` - 添加收藏
- `DELETE /api/favorites/:boothId` - 取消收藏

### 评价
- `GET /api/reviews/booth/:boothId` - 摊位评价
- `POST /api/reviews` - 提交评价

## 👥 用户角色

- **visitor** - 普通观众，可以浏览展会和评价
- **vendor** - 摊主，可以申请摊位
- **admin** - 管理员，可以审核摊位
