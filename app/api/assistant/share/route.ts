import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase/client';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Vous devez être connecté pour partager une conversation.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, messages, farmName } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Conversation vide impossible à partager.' },
        { status: 400 }
      );
    }

    const shareToken = 'shr_' + crypto.randomBytes(8).toString('hex');
    const authorNom = user.nom || user.email?.split('@')[0] || 'Producteur AgriImpact';

    if (isSupabaseConfigured && supabase) {
      const { error: dbError } = await supabase.from('shared_conversations').insert({
        share_token: shareToken,
        user_id: user.id,
        author_nom: authorNom,
        title: title || 'Conseil Agrométéorologique',
        messages: {
          farmName: farmName || 'Exploitation Agricole',
          items: messages,
        },
      });

      if (dbError) {
        console.error('Erreur insertion partage DB:', dbError);
      }
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://agrimpact.vercel.app';
    const shareUrl = `${origin}/assistant/shared/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareId: shareToken,
      shareUrl,
      title: title || 'Conseil Agrométéorologique',
    });
  } catch (error: any) {
    console.error('Erreur création partage:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du lien de partage.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Accès restreint aux membres connectés.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Jeton de partage manquant.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('shared_conversations')
        .select('*')
        .eq('share_token', token)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: 'Ce partage est introuvable ou a été révoqué.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        conversation: {
          id: data.id,
          shareToken: data.share_token,
          title: data.title,
          authorNom: data.author_nom,
          isOwner: data.user_id === user.id,
          createdAt: data.created_at,
          farmName: data.messages?.farmName || 'Exploitation Agricole',
          messages: data.messages?.items || [],
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Service de partage non configuré.' },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la lecture du partage.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token manquant.' }, { status: 400 });
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('shared_conversations')
        .delete()
        .eq('share_token', token)
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Partage révoqué avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
