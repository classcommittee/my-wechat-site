// functions/api/login.js
export async function onRequest(context) {
  try {
    const body = await context.request.json();
    if (body.username === '朱伟豪' && body.password === '01020825') {
      return new Response(JSON.stringify({ success: true, token: 'admin-token' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    return new Response(JSON.stringify({ success: false, message: '用户名或密码错误' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch {
    return new Response(JSON.stringify({ success: false, message: '请求错误' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}