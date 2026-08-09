// ===== 配置 =====
const API_BASE = 'https://my-wechat-api.class-committee.workers.dev/api';

// ===== 工具函数 =====
function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    return fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    }).then(res => res.json());
}

// ===== 首页加载文章 =====
async function loadHomeArticles() {
    const container = document.getElementById('articlesContainer');
    try {
        const data = await apiFetch('/articles');
        if (data.success && data.data.length) {
            container.innerHTML = data.data.map(a => `
                <div class="article-card">
                    <h3>${a.title}</h3>
                    <div class="meta">
                        <span>${a.category === 'notice' ? '📢 公告' : '📰 资讯'}</span>
                        <span>${new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="summary">${a.content ? a.content.substring(0, 80) + '...' : ''}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="loading">暂无文章</div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="loading">加载失败，请稍后重试</div>';
    }
}

// ===== 首页加载公告 =====
async function loadHomeNotice() {
    try {
        const data = await apiFetch('/articles?category=notice&limit=1');
        const el = document.getElementById('noticeText');
        if (data.success && data.data.length) {
            el.textContent = data.data[0].title;
        } else {
            el.textContent = '暂无公告';
        }
    } catch (e) {
        document.getElementById('noticeText').textContent = '加载公告失败';
    }
}

// ===== 登录 =====
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errEl = document.getElementById('loginError');
        try {
            const res = await apiFetch('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            if (res.success) {
                localStorage.setItem('adminToken', res.token);
                localStorage.setItem('adminUser', username);
                window.location.href = 'dashboard.html';
            } else {
                errEl.textContent = res.message || '登录失败';
            }
        } catch (e) {
            errEl.textContent = '网络错误，请重试';
        }
    });
}

// ===== 后台管理 =====
if (document.querySelector('.dashboard')) {
    // 检查登录
    if (!localStorage.getItem('adminToken')) {
        window.location.href = 'admin.html';
    }

    // 切换页面
    document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
            document.getElementById(`page${link.dataset.page.charAt(0).toUpperCase() + link.dataset.page.slice(1)}`).classList.add('active');
            if (link.dataset.page === 'articles') loadAdminArticles();
            if (link.dataset.page === 'notice') loadAdminNotices();
        });
    });

    // 退出
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = 'admin.html';
    });

    // 加载文章列表
    async function loadAdminArticles() {
        const container = document.getElementById('articleList');
        const data = await apiFetch('/articles');
        if (data.success) {
            container.innerHTML = data.data.filter(a => a.category !== 'notice').map(a => `
                <div class="item">
                    <div class="info"><h4>${a.title}</h4><div class="meta">${new Date(a.createdAt).toLocaleString()}</div></div>
                    <div class="actions">
                        <button class="edit-btn" onclick="editArticle('${a.id}')">编辑</button>
                        <button class="del-btn" onclick="deleteArticle('${a.id}')">删除</button>
                    </div>
                </div>
            `).join('') || '<div style="color:#999;padding:20px;">暂无文章</div>';
        }
    }

    // 加载公告列表
    async function loadAdminNotices() {
        const container = document.getElementById('noticeList');
        const data = await apiFetch('/articles?category=notice');
        if (data.success) {
            container.innerHTML = data.data.map(a => `
                <div class="item">
                    <div class="info"><h4>📢 ${a.title}</h4><div class="meta">${new Date(a.createdAt).toLocaleString()}</div></div>
                    <div class="actions">
                        <button class="edit-btn" onclick="editArticle('${a.id}')">编辑</button>
                        <button class="del-btn" onclick="deleteArticle('${a.id}')">删除</button>
                    </div>
                </div>
            `).join('') || '<div style="color:#999;padding:20px;">暂无公告</div>';
        }
    }

    // 弹窗控制
    const modal = document.getElementById('editorModal');
    const closeBtn = document.querySelector('.modal-close');
    function openModal(type, data = null) {
        document.getElementById('editType').value = type;
        document.getElementById('modalTitle').textContent = type === 'article' ? '写文章' : '发公告';
        document.getElementById('editId').value = data?.id || '';
        document.getElementById('editTitle').value = data?.title || '';
        document.getElementById('editContent').value = data?.content || '';
        document.getElementById('editCategory').value = data?.category || type;
        modal.classList.add('show');
    }
    window.openModal = openModal;
    closeBtn.onclick = () => modal.classList.remove('show');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };

    // 写文章
    document.getElementById('newArticleBtn').addEventListener('click', () => openModal('article'));
    document.getElementById('newNoticeBtn').addEventListener('click', () => openModal('notice'));

    // 编辑文章
    window.editArticle = async (id) => {
        const data = await apiFetch(`/article/${id}`);
        if (data.success) {
            openModal(data.data.category === 'notice' ? 'notice' : 'article', data.data);
        }
    };

    // 删除文章
    window.deleteArticle = async (id) => {
        if (!confirm('确定要删除吗？')) return;
        const res = await apiFetch(`/article/${id}`, { method: 'DELETE' });
        if (res.success) {
            loadAdminArticles();
            loadAdminNotices();
        } else {
            alert('删除失败');
        }
    };

    // 提交文章/公告
    document.getElementById('editorForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const type = document.getElementById('editType').value;
        const data = {
            title: document.getElementById('editTitle').value,
            content: document.getElementById('editContent').value,
            category: document.getElementById('editCategory').value
        };
        const url = id ? `/article/${id}` : '/article';
        const method = id ? 'PUT' : 'POST';
        const res = await apiFetch(url, { method, body: JSON.stringify(data) });
        if (res.success) {
            modal.classList.remove('show');
            loadAdminArticles();
            loadAdminNotices();
        } else {
            alert(res.message || '操作失败');
        }
    });

    // 初始加载
    loadAdminArticles();
}

// ===== 首页初始化 =====
if (document.getElementById('articlesContainer')) {
    loadHomeArticles();
    loadHomeNotice();
}
