// src/routes/api/test.ts

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'OK',
      message: 'API do São Brás do Suaçuí funcionando!',
      timestamp: new Date().toISOString(),
      gemini: !!process.env.GEMINI_API_KEY,
      supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
}