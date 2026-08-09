const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-me';
const DATA_FILE = path.join(__dirname, 'data.json');

// ===== 中间件 =====
app.use(cors());
app.use(express.json());

// ===== 数据读写 =====
function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        const defaultData = { 
            articles: [], 
            users: [{ username: 'admin', password: bcrypt.hashSync('123456', 10) }],
            settings: { siteName: '25数控2班' }
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===== 生成ID =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ===== 验证Token =====
function verifyToken(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Token无效' });
    }
}

// ===== 路由 =====

// 登录
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const data = readData();
    const user = data.users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.json({ success: false, message: '用户名或密码错误' });
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token });
});

// 获取文章列表
app.get('/api/articles', (req, res) => {
    const { category, limit } = req.query;
    const data = readData();
    let articles = data.articles || [];
    if (category) articles = articles.filter(a => a.category === category);
    articles = articles.sort((a, b) => b.createdAt - a.createdAt);
    if (limit) articles = articles.slice(0, parseInt(limit));
    res.json({ success: true, data: articles });
});

// 获取单篇文章
app.get('/api/article/:id', (req, res) => {
    const data = readData();
    const article = data.articles.find(a => a.id === req.params.id);
    if (!article) return res.json({ success: false, message: '文章不存在' });
    res.json({ success: true, data: article });
});

// 创建文章（需登录）
app.post('/api/article', verifyToken, (req, res) => {
    const { title, content, category } = req.body;
    if (!title || !content) {
        return res.json({ success: false, message: '标题和内容不能为空' });
    }
    const data = readData();
    const newArticle = {
        id: generateId(),
        title,
        content,
        category: category || 'news',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    data.articles.push(newArticle);
    writeData(data);
    res.json({ success: true, data: newArticle });
});

// 更新文章（需登录）
app.put('/api/article/:id', verifyToken, (req, res) => {
    const { title, content, category } = req.body;
    const data = readData();
    const idx = data.articles.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.json({ success: false, message: '文章不存在' });
    data.articles[idx] = {
        ...data.articles[idx],
        title: title || data.articles[idx].title,
        content: content || data.articles[idx].content,
        category: category || data.articles[idx].category,
        updatedAt: Date.now()
    };
    writeData(data);
    res.json({ success: true, data: data.articles[idx] });
});

// 删除文章（需登录）
app.delete('/api/article/:id', verifyToken, (req, res) => {
    const data = readData();
    data.articles = data.articles.filter(a => a.id !== req.params.id);
    writeData(data);
    res.json({ success: true });
});

// 获取站点设置
app.get('/api/settings', (req, res) => {
    const data = readData();
    res.json({ success: true, data: data.settings || {} });
});

// 更新站点设置（需登录）
app.put('/api/settings', verifyToken, (req, res) => {
    const data = readData();
    data.settings = { ...data.settings, ...req.body };
    writeData(data);
    res.json({ success: true, data: data.settings });
});

app.listen(PORT, () => {
    console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
});