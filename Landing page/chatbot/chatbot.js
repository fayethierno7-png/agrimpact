/**
 * AGRIMPACT CHATBOT JS - Standalone Module
 * Connexion à l'API serveur sécurisée /api/assistant/chat
 */

document.addEventListener('DOMContentLoaded', () => {
  const messagesContainer = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const newChatBtn = document.getElementById('newChatBtn');
  const searchInput = document.getElementById('searchInput');
  const pinnedList = document.getElementById('pinnedList');
  const recentList = document.getElementById('recentList');
  const chatTitle = document.getElementById('chatTitle');

  let conversations = JSON.parse(localStorage.getItem('agrimpact_ai_conversations')) || [
    {
      id: 'c1',
      title: 'Conseil maïs & fertilisation',
      isPinned: true,
      messages: [
        { role: 'user', content: 'Quels sont les besoins en eau du maïs à Thiès ?' },
        { role: 'assistant', content: 'Le maïs consomme entre 6 et 8 mm d\'eau par jour pendant sa floraison mâle. Veillez à irriguer aux heures fraîches pour éviter les avortements floraux.' }
      ]
    },
    {
      id: 'c2',
      title: 'Mildiou Oignon (Kayar)',
      isPinned: false,
      messages: [
        { role: 'user', content: 'Quand traiter contre le mildiou ?' },
        { role: 'assistant', content: 'Traitez impérativement lors d\'un créneau sans vent (< 15 km/h) et sans pluie annoncée dans les 6h (fenêtre matinale conseillée : 06h30 - 09h30).' }
      ]
    }
  ];

  let activeConvId = conversations[0]?.id || null;

  function saveConvs() {
    localStorage.setItem('agrimpact_ai_conversations', JSON.stringify(conversations));
    renderSidebar();
  }

  function getActiveConv() {
    return conversations.find(c => c.id === activeConvId);
  }

  function renderSidebar() {
    const q = (searchInput?.value || '').toLowerCase().trim();
    pinnedList.innerHTML = '';
    recentList.innerHTML = '';

    const filtered = conversations.filter(c => !q || c.title.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)));

    filtered.forEach(c => {
      const el = document.createElement('div');
      el.className = `conv-item ${c.id === activeConvId ? 'active' : ''}`;
      el.innerHTML = `<span>${c.isPinned ? '📌 ' : ''}${c.title}</span>`;
      el.addEventListener('click', () => {
        activeConvId = c.id;
        renderSidebar();
        renderMessages();
      });

      if (c.isPinned) {
        pinnedList.appendChild(el);
      } else {
        recentList.appendChild(el);
      }
    });
  }

  function renderMessages() {
    const conv = getActiveConv();
    if (!conv) return;

    if (chatTitle) chatTitle.textContent = conv.title;
    messagesContainer.innerHTML = '';

    if (conv.messages.length === 0) {
      messagesContainer.innerHTML = `
        <div style="text-align:center; padding: 40px 20px;">
          <h3 style="font-size: 1.3rem; margin-bottom: 8px;">Bonjour 👋</h3>
          <p style="font-size: 0.85rem; color: #6B7280; max-width: 480px; margin: 0 auto 24px auto;">
            Je suis l'assistant IA officiel d'AgriImpact. Posez-moi vos questions sur la météo, vos parcelles ou la protection des cultures au Sénégal.
          </p>
          <div class="suggestions-grid" style="margin: 0 auto;">
            <div class="suggestion-card" data-text="Que signifie 70% de probabilité de pluie ?">🌦️ 70% de pluie : irriguer ou attendre ?</div>
            <div class="suggestion-card" data-text="Quels sont les besoins en eau du maïs en floraison ?">🌱 Besoins en eau du maïs</div>
            <div class="suggestion-card" data-text="Comment reconnaître le mildiou sur l'oignon ?">🧅 Alerte mildiou de l'oignon</div>
            <div class="suggestion-card" data-text="Quelles sont les meilleures variétés d'arachide ?">🥜 Variétés d'arachide ISRA</div>
          </div>
        </div>
      `;

      document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
          const txt = card.getAttribute('data-text');
          if (txt) sendMessage(txt);
        });
      });
      return;
    }

    conv.messages.forEach((msg, idx) => {
      const isAI = msg.role === 'assistant';
      const row = document.createElement('div');
      row.className = `msg-row ${isAI ? 'ai' : 'user'}`;
      row.innerHTML = `
        <div class="msg-avatar ${isAI ? 'ai' : 'user'}">${isAI ? '🌱' : '👤'}</div>
        <div>
          <div class="msg-bubble">${msg.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
          ${isAI ? `
            <div class="msg-actions">
              <button class="msg-action-btn btn-copy">📋 Copier</button>
              <button class="msg-action-btn btn-like">👍 J'aime</button>
              <button class="msg-action-btn btn-dislike">👎</button>
              <button class="msg-action-btn btn-retry">🔄 Réessayer</button>
            </div>
          ` : ''}
        </div>
      `;

      if (isAI) {
        row.querySelector('.btn-copy')?.addEventListener('click', () => {
          navigator.clipboard.writeText(msg.content);
          alert('Conseil copié !');
        });
        row.querySelector('.btn-like')?.addEventListener('click', (e) => {
          e.target.style.color = '#059669';
          e.target.style.fontWeight = 'bold';
        });
        row.querySelector('.btn-dislike')?.addEventListener('click', (e) => {
          e.target.style.color = '#DC2626';
        });
        row.querySelector('.btn-retry')?.addEventListener('click', () => {
          if (conv.messages[idx - 1]?.content) {
            sendMessage(conv.messages[idx - 1].content);
          }
        });
      }

      messagesContainer.appendChild(row);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function sendMessage(text) {
    const conv = getActiveConv();
    if (!conv || !text.trim()) return;

    // Ajout message user
    conv.messages.push({ role: 'user', content: text });
    if (conv.messages.length === 1) {
      conv.title = text.slice(0, 28) + (text.length > 28 ? '...' : '');
    }
    renderMessages();
    saveConvs();

    if (chatInput) chatInput.value = '';

    // Appel API backend
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conv.messages })
      });

      const json = await res.json();
      if (json.success && json.reply) {
        conv.messages.push({ role: 'assistant', content: json.reply });
      } else {
        throw new Error(json.error || 'Erreur API');
      }
    } catch (err) {
      conv.messages.push({
        role: 'assistant',
        content: `Je peux vous aider à analyser la situation, mais un agronome de terrain doit valider vos choix. (Détail: ${err.message || 'connexion réseau'})`
      });
    }

    renderMessages();
    saveConvs();
  }

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (chatInput && chatInput.value.trim()) {
        sendMessage(chatInput.value.trim());
      }
    });
  }

  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      const newId = 'c-' + Date.now();
      conversations.unshift({
        id: newId,
        title: 'Nouvelle conversation',
        isPinned: false,
        messages: []
      });
      activeConvId = newId;
      saveConvs();
      renderMessages();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderSidebar);
  }

  renderSidebar();
  renderMessages();
});
