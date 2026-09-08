import { NextRequest, NextResponse } from 'next/server';
import { AGRIMPACT_SYSTEM_PROMPT, generateLocalAgronomicResponse } from '../../../../lib/assistant/systemPrompt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Historique de messages obligatoire.' },
        { status: 400 }
      );
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Récupération sécurisée des clés API côté serveur exclusivement
    const groqKey = process.env.GROQ_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    // 1. Tentative avec l'API Groq (Ultra-rapide avec openai/gpt-oss-120b ou 20b)
    if (groqKey) {
      const preferredModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
      for (const groqModel of preferredModels) {
        try {
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [
                { role: 'system', content: AGRIMPACT_SYSTEM_PROMPT },
                ...messages.map((m: any) => ({
                  role: m.role === 'user' ? 'user' : 'assistant',
                  content: m.content,
                })),
              ],
              temperature: 0.4,
              max_tokens: 1200,
            }),
          });

          if (groqResponse.ok) {
            const data = await groqResponse.json();
            const reply = data.choices?.[0]?.message?.content;
            if (reply) {
              return NextResponse.json({
                success: true,
                reply: reply.trim(),
                provider: 'groq',
                model: groqModel,
              });
            }
          } else {
            console.warn(`Tentative Groq (${groqModel}) statut:`, groqResponse.status);
          }
        } catch (groqErr) {
          console.warn(`Erreur réseau appel Groq (${groqModel}):`, groqErr);
        }
      }
    }

    // 2. Tentative avec l'API OpenAI si configurée
    if (openAiKey) {
      try {
        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: AGRIMPACT_SYSTEM_PROMPT },
              ...messages.map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
              })),
            ],
            temperature: 0.4,
            max_tokens: 1024,
          }),
        });

        if (openAiResponse.ok) {
          const data = await openAiResponse.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({
              success: true,
              reply: reply.trim(),
              provider: 'openai',
              model: 'gpt-4o-mini',
            });
          }
        }
      } catch (openAiErr) {
        console.warn('Erreur réseau appel OpenAI:', openAiErr);
      }
    }

    // 3. Moteur Agronomique Expert de Repli (100% fiable, hors-ligne / sans clé)
    const localReply = generateLocalAgronomicResponse(lastUserMessage);

    return NextResponse.json({
      success: true,
      reply: localReply,
      provider: 'agrimpact-expert-engine',
      model: 'agrimpact-agronomy-v1',
    });
  } catch (error: any) {
    console.error('Erreur API Assistant AgriImpact:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur interne lors du traitement de votre question.',
      },
      { status: 500 }
    );
  }
}
