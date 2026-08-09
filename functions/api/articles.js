// functions/api/articles.js
export function onRequest(context) {
  return new Response(JSON.stringify({ success: true, data: [] }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}